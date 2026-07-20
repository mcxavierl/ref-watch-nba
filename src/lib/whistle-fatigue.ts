import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import type { RefProfile } from "@/lib/types";
import {
  gameWhistleTotal,
  hasWhistlePeriodSplits,
  sumBuckets,
  type WhistlePeriodBucket,
  type WhistlePeriodSplits,
  type WhistleSplitUnit,
} from "@/lib/whistle-period-splits";
import {
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

export const WHISTLE_DRIFT_MIN_GAMES = 12;
export const WHISTLE_DRIFT_EXTREME_PCT = 12;

export type WhistleDriftPattern = "fatigue" | "escalation" | "neutral";

export interface RefWhistleFatigueProfile {
  refSlug: string;
  leagueId: LeagueId;
  gamesWithSplits: number;
  unit: WhistleSplitUnit;
  earlyAvgPerPeriod: number;
  lateAvgPerPeriod: number;
  lateVsEarlyPct: number;
  pattern: WhistleDriftPattern;
  trendSlope: number;
  periodAverages: number[];
  periodLabels: string[];
  latePeriodLabel: string;
  earlyPeriodLabel: string;
  driftHeadline: string;
  metricLabel: string;
}

const LEAGUE_TO_DATA: Record<(typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number], DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
};

const METRIC_LABELS: Partial<Record<LeagueId, string>> = {
  nfl: "flags",
  nhl: "minors",
  epl: "fouls",
  laliga: "fouls",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function officiatedBy(game: RuntimeGameLogEntry, slug: string): boolean {
  return game.officials.some(
    (official) => refSlug(official.name, official.number) === slug,
  );
}

function fatigueCacheKey(leagueId: LeagueId, refSlugValue: string): string {
  return `whistle-fatigue:${leagueId}:${refSlugValue}`;
}

function resolveWindow(
  leagueId: LeagueId,
  splits: WhistlePeriodSplits,
): {
  earlyPeriods: number[];
  latePeriods: number[];
  earlyLabel: string;
  lateLabel: string;
} | null {
  const periods = splits.buckets.map((bucket) => bucket.period);
  if (periods.length < 2) return null;

  if (splits.unit === "quarter") {
    const regulation = periods.filter((period) => period <= 4);
    if (regulation.length < 2) return null;
    return {
      earlyPeriods: regulation.filter((period) => period <= 2),
      latePeriods: regulation.filter((period) => period >= 3),
      earlyLabel: "first half",
      lateLabel: "4th quarter",
    };
  }

  if (splits.unit === "half") {
    return {
      earlyPeriods: [1],
      latePeriods: [2],
      earlyLabel: "1st half",
      lateLabel: "2nd half",
    };
  }

  if (splits.unit === "period" || leagueId === "nhl") {
    const maxPeriod = Math.max(...periods.filter((period) => period <= 3));
    if (maxPeriod < 3) return null;
    return {
      earlyPeriods: periods.filter((period) => period <= 2),
      latePeriods: [3],
      earlyLabel: "1st/2nd period",
      lateLabel: "3rd period",
    };
  }

  return null;
}

function perPeriodTotals(buckets: WhistlePeriodBucket[]): number[] {
  return buckets
    .slice()
    .sort((a, b) => a.period - b.period)
    .map((bucket) => gameWhistleTotal(bucket));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function linearTrendSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = average(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function classifyPattern(lateVsEarlyPct: number): WhistleDriftPattern {
  if (lateVsEarlyPct <= -WHISTLE_DRIFT_EXTREME_PCT) return "fatigue";
  if (lateVsEarlyPct >= WHISTLE_DRIFT_EXTREME_PCT) return "escalation";
  return "neutral";
}

function periodLabelsForUnit(unit: WhistleSplitUnit, count: number): string[] {
  if (unit === "quarter") {
    return ["Q1", "Q2", "Q3", "Q4", "OT"].slice(0, count);
  }
  if (unit === "half") {
    return ["H1", "H2"].slice(0, count);
  }
  return ["P1", "P2", "P3", "OT"].slice(0, count);
}

function buildDriftHeadline(
  profile: Pick<
    RefWhistleFatigueProfile,
    | "pattern"
    | "lateVsEarlyPct"
    | "latePeriodLabel"
    | "earlyPeriodLabel"
    | "metricLabel"
  >,
): string {
  const magnitude = Math.abs(profile.lateVsEarlyPct).toFixed(0);
  if (profile.pattern === "fatigue") {
    return `Maintains a ${magnitude}% lower ${profile.metricLabel} threshold in the ${profile.latePeriodLabel} compared to ${profile.earlyPeriodLabel} baselines`;
  }
  if (profile.pattern === "escalation") {
    return `Shows a ${magnitude}% higher ${profile.metricLabel} rate in the ${profile.latePeriodLabel} compared to ${profile.earlyPeriodLabel} baselines`;
  }
  return `Keeps a stable ${profile.metricLabel} pace from ${profile.earlyPeriodLabel} through the ${profile.latePeriodLabel}`;
}

function aggregateGameWindows(
  splits: WhistlePeriodSplits,
  leagueId: LeagueId,
): { earlyRate: number; lateRate: number; earlyLabel: string; lateLabel: string } | null {
  const window = resolveWindow(leagueId, splits);
  if (!window) return null;

  const early = sumBuckets(splits.buckets, window.earlyPeriods);
  const late = sumBuckets(splits.buckets, window.latePeriods);
  const earlyTotal = early.home + early.away;
  const lateTotal = late.home + late.away;
  if (earlyTotal === 0 && lateTotal === 0) return null;

  return {
    earlyRate: earlyTotal / window.earlyPeriods.length,
    lateRate: lateTotal / window.latePeriods.length,
    earlyLabel: window.earlyLabel,
    lateLabel: window.lateLabel,
  };
}

/** Request-scoped whistle drift profile for one official. */
export function computeRefWhistleFatigue(
  leagueId: LeagueId,
  profile: RefProfile,
  gameLogs?: RuntimeGameLogEntry[] | null,
): RefWhistleFatigueProfile | null {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
    return null;
  }

  const cache = getWorkerIsolateStore().matrixCompute;
  const cacheKey = fatigueCacheKey(leagueId, profile.slug);
  const cached = cache.get(cacheKey);
  if (cached) return cached as RefWhistleFatigueProfile;

  const dataLeague = LEAGUE_TO_DATA[leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  let allGames: RuntimeGameLogEntry[] | null =
    gameLogs ?? loadRuntimeGameLogs(dataLeague)?.games ?? null;

  if (!allGames?.length) {
    releaseParsedPayload(allGames);
    return null;
  }

  let officiated: RuntimeGameLogEntry[] | null = [];
  let earlyRates: number[] | null = [];
  let lateRates: number[] | null = [];
  let periodSums: number[] | null = null;
  let periodCounts: number[] | null = null;
  let unit: WhistleSplitUnit = "quarter";
  let earlyLabel = "early periods";
  let lateLabel = "late periods";

  try {
    for (const game of allGames) {
      if (!officiatedBy(game, profile.slug)) continue;
      if (!hasWhistlePeriodSplits(game.whistlePeriodSplits)) continue;
      officiated.push(game);

      const window = aggregateGameWindows(game.whistlePeriodSplits, leagueId);
      if (!window) continue;

      earlyRates.push(window.earlyRate);
      lateRates.push(window.lateRate);
      earlyLabel = window.earlyLabel;
      lateLabel = window.lateLabel;
      unit = game.whistlePeriodSplits.unit;

      const totals = perPeriodTotals(game.whistlePeriodSplits.buckets);
      if (!periodSums) {
        periodSums = totals.map(() => 0);
        periodCounts = totals.map(() => 0);
      }
      totals.forEach((value, index) => {
        periodSums![index] = (periodSums![index] ?? 0) + value;
        periodCounts![index] = (periodCounts![index] ?? 0) + 1;
      });
    }

    if (!officiated.length || earlyRates.length === 0 || lateRates.length === 0) {
      return null;
    }

    const earlyAvgPerPeriod = average(earlyRates);
    const lateAvgPerPeriod = average(lateRates);
    const lateVsEarlyPct =
      earlyAvgPerPeriod === 0
        ? 0
        : ((lateAvgPerPeriod - earlyAvgPerPeriod) / earlyAvgPerPeriod) * 100;
    const periodAverages =
      periodSums?.map((sum, index) =>
        periodCounts![index] > 0 ? sum / periodCounts![index] : 0,
      ) ?? [];
    const pattern = classifyPattern(lateVsEarlyPct);
    const metricLabel = METRIC_LABELS[leagueId] ?? "fouls";

    const result: RefWhistleFatigueProfile = {
      refSlug: profile.slug,
      leagueId,
      gamesWithSplits: earlyRates.length,
      unit,
      earlyAvgPerPeriod,
      lateAvgPerPeriod,
      lateVsEarlyPct,
      pattern,
      trendSlope: linearTrendSlope(periodAverages),
      periodAverages,
      periodLabels: periodLabelsForUnit(unit, periodAverages.length),
      latePeriodLabel: lateLabel,
      earlyPeriodLabel: earlyLabel,
      metricLabel,
      driftHeadline: "",
    };
    result.driftHeadline = buildDriftHeadline(result);

    if (result.gamesWithSplits < WHISTLE_DRIFT_MIN_GAMES) {
      return null;
    }

    cache.set(cacheKey, result);
    return result;
  } finally {
    officiated = releaseParsedPayload(officiated);
    earlyRates = releaseParsedPayload(earlyRates);
    lateRates = releaseParsedPayload(lateRates);
    periodSums = releaseParsedPayload(periodSums);
    periodCounts = releaseParsedPayload(periodCounts);
    allGames = releaseParsedPayload(allGames);
  }
}
