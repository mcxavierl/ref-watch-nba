import type { LeagueConfig, LeagueId } from "@/lib/leagues";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import {
  enrichRefWithOriginVariance,
  isOriginVarianceOutlier,
} from "@/lib/geo-origin-variance";
import { teamNationForLeague } from "@/lib/insights/team-nation";
import { filterNhlReferees } from "@/lib/nhl/officials";
import { deltaTone as metricDeltaTone } from "@/lib/metricTone";
import {
  overRateHeroTone,
  populationStdDev,
} from "@/lib/metric-significance";
import {
  directoryScoringDisplay,
  directoryWhistleDisplay,
  scoringVsLeaguePct,
  whistleVsLeaguePct,
} from "@/lib/scoring-metrics";
import { qualifiedRefs, sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type NflDirectoryMetric = "points" | "flags" | "penaltyYards";

export const NFL_DIRECTORY_METRICS: {
  id: NflDirectoryMetric;
  label: string;
}[] = [
  { id: "points", label: "Points Δ" },
  { id: "flags", label: "Flags Δ" },
  { id: "penaltyYards", label: "Yards Δ" },
];

export type NhlDirectoryMetric = "goals" | "pim" | "ppo";

export const NHL_DIRECTORY_METRICS: {
  id: NhlDirectoryMetric;
  label: string;
}[] = [
  { id: "goals", label: "vs avg" },
  { id: "pim", label: "PIM Δ" },
  { id: "ppo", label: "PPO Δ" },
];

export type RefsDirectoryTab = "over-high" | "over-low" | "experienced";

export const REFS_DIRECTORY_TABS: {
  id: RefsDirectoryTab;
  label: string;
  description: string;
}[] = [
  {
    id: "over-high",
    label: "Highest over rates",
    description: "Officials whose games finish above the league benchmark most often.",
  },
  {
    id: "over-low",
    label: "Highest under rates",
    description: "Officials whose games finish below the league benchmark most often.",
  },
  {
    id: "experienced",
    label: "Most experienced",
    description: "Largest multi-season samples in the dataset.",
  },
];

export const REFS_DIRECTORY_INITIAL_COUNT = 25;
export const REFS_DIRECTORY_TOP_COUNT = 10;
export const REFS_DIRECTORY_BOTTOM_COUNT = 10;
/** 0-based slice start for bottom tier (ranks 16–25). */
export const REFS_DIRECTORY_BOTTOM_START = 15;

export type RefsDirectoryPreviewRow = {
  ref: RefProfile;
  rank: number;
};

/** Default list: top 10 and bottom 10 by current sort; middle ranks hidden until expanded. */
export function buildRefsDirectoryPreviewRows(
  discovered: RefProfile[],
  expanded: boolean,
): RefsDirectoryPreviewRow[] {
  if (expanded) {
    return discovered.map((ref, index) => ({ ref, rank: index + 1 }));
  }

  const top = discovered
    .slice(0, REFS_DIRECTORY_TOP_COUNT)
    .map((ref, index) => ({ ref, rank: index + 1 }));

  if (discovered.length <= REFS_DIRECTORY_BOTTOM_START) {
    return top;
  }

  const bottom = discovered
    .slice(
      REFS_DIRECTORY_BOTTOM_START,
      REFS_DIRECTORY_BOTTOM_START + REFS_DIRECTORY_BOTTOM_COUNT,
    )
    .map((ref, index) => ({
      ref,
      rank: REFS_DIRECTORY_BOTTOM_START + index + 1,
    }));

  return [...top, ...bottom];
}
export const REFS_DIRECTORY_SPOTLIGHT_COUNT = 3;

export type RefsDiscoveryFilter = {
  query?: string;
  outliersOnly?: boolean;
  pool?: RefProfile[];
};

export interface RefsDirectoryMeta {
  seasons: string[];
  seasonCount: number;
  minSampleSize: number;
  leagueOverBaseline: number;
  leagueAvgTotal: number;
  leagueAvgFouls: number;
  qualifiedCount: number;
  totalGameRecords: number;
  totalGameRecordsLabel: string;
}

export interface RefsDirectoryContext {
  refs: RefProfile[];
  meta: RefsDirectoryMeta;
  league: LeagueConfig;
}

function formatRoundedPlus(n: number): string {
  if (n >= 1000) {
    const rounded = Math.floor(n / 1000) * 1000;
    return `${rounded.toLocaleString("en-US")}+`;
  }
  return `${n.toLocaleString("en-US")}+`;
}

export function buildRefsDirectoryContext(
  stats: RefStatsFile,
  league: LeagueConfig,
): RefsDirectoryContext {
  const pool =
    league.id === "nhl" ? filterNhlReferees(stats.refs) : stats.refs;
  const resolveTeamNation = (abbr: string) => teamNationForLeague(league.id, abbr);
  const enriched = pool.map((ref) => enrichRefWithOriginVariance(ref, resolveTeamNation));
  const qualified = qualifiedRefs(enriched, stats.meta.minSampleSize);
  const totalGameRecords = qualified.reduce((sum, ref) => sum + ref.games, 0);

  return {
    refs: qualified,
    meta: {
      seasons: stats.meta.seasons,
      seasonCount: stats.meta.seasons.length,
      minSampleSize: stats.meta.minSampleSize,
      leagueOverBaseline: stats.meta.leagueOverBaseline,
      leagueAvgTotal: stats.meta.leagueAvgTotal,
      leagueAvgFouls: stats.meta.leagueAvgFouls,
      qualifiedCount: qualified.length,
      totalGameRecords,
      totalGameRecordsLabel: formatRoundedPlus(totalGameRecords),
    },
    league,
  };
}

function tabToSort(tab: RefsDirectoryTab): RefRankingSort {
  switch (tab) {
    case "over-high":
      return "overRate-desc";
    case "over-low":
      return "overRate-asc";
    case "experienced":
      return "games-desc";
  }
}

export function sortRefsDirectory(
  refs: RefProfile[],
  tab: RefsDirectoryTab,
): RefProfile[] {
  return sortRefRankings(refs, tabToSort(tab));
}

export function deltaTone(
  delta: number,
  overBaseline: number,
): "positive" | "negative" | "neutral" {
  const threshold = overBaseline > 50 ? 2 : 0.3;
  if (delta > threshold) return "positive";
  if (delta < -threshold) return "negative";
  return "neutral";
}

export function formatDirectoryDelta(n: number, decimals = 1): string {
  if (Math.abs(n) < 0.05) return (0).toFixed(decimals);
  return formatSigned(n, decimals);
}

export function nflDirectoryMetricDelta(
  ref: RefProfile,
  metric: NflDirectoryMetric,
): number | null {
  switch (metric) {
    case "points":
      return ref.totalPointsDelta;
    case "flags":
      return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
    case "penaltyYards":
      return ref.nflAnalytics?.penaltyYardsDelta ?? null;
  }
}

export function nhlDirectoryMetricDelta(
  ref: RefProfile,
  metric: NhlDirectoryMetric,
  leagueAvgTotal: number,
  leagueAvgFouls: number,
): number | null {
  switch (metric) {
    case "goals":
      return scoringVsLeaguePct(ref.avgTotalPoints, leagueAvgTotal);
    case "pim":
      return whistleVsLeaguePct(ref.avgFouls, leagueAvgFouls);
    case "ppo":
      return null;
  }
}

export function nhlDirectoryMetricDisplay(
  ref: RefProfile,
  metric: NhlDirectoryMetric,
  leagueAvgTotal: number,
  leagueAvgFouls: number,
): { value: number; formatted: string; usePct: boolean } | null {
  switch (metric) {
    case "goals":
      return directoryScoringDisplay(ref, leagueAvgTotal);
    case "pim":
      return directoryWhistleDisplay(
        ref.foulsDelta,
        ref.avgFouls,
        leagueAvgFouls,
      );
    case "ppo":
      return null;
  }
}

export function directoryDeltaTone(
  delta: number,
  overBaseline: number,
  heatMap = false,
  usePct = false,
): "positive" | "negative" | "neutral" {
  if (Math.abs(delta) < (usePct ? 0.05 : 0.05)) return "neutral";
  if (heatMap) {
    const threshold = usePct ? 0.8 : 0;
    return metricDeltaTone(delta, threshold);
  }
  return deltaTone(delta, overBaseline);
}

export function computeOverRateMean(refs: RefProfile[]): number {
  if (refs.length === 0) return 0;
  return refs.reduce((sum, ref) => sum + ref.overRate, 0) / refs.length;
}

function overRateDeviation(ref: RefProfile, mean: number): number {
  return Math.abs(ref.overRate - mean);
}

export function selectSpotlightRefs(
  refs: RefProfile[],
  tab: RefsDirectoryTab,
  count = REFS_DIRECTORY_SPOTLIGHT_COUNT,
): RefProfile[] {
  return sortRefsDirectory(refs, tab).slice(0, count);
}

export function filterRefsDiscovery(
  refs: RefProfile[],
  filter: RefsDiscoveryFilter,
): RefProfile[] {
  let result = refs;

  if (filter.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    result = result.filter(
      (ref) =>
        ref.name.toLowerCase().includes(q) ||
        ref.slug.toLowerCase().includes(q),
    );
  }

  if (filter.outliersOnly) {
    const pool = filter.pool ?? refs;
    const mean = computeOverRateMean(pool);
    const variance =
      pool.reduce((sum, ref) => sum + (ref.overRate - mean) ** 2, 0) /
      pool.length;
    const stdDev = Math.sqrt(variance);
    result = result.filter(
      (ref) =>
        (stdDev > 0 && overRateDeviation(ref, mean) >= stdDev) ||
        isOriginVarianceOutlier(ref),
    );
  }

  return result;
}

export function sortRefsByOutlierDeviation(refs: RefProfile[]): RefProfile[] {
  const mean = computeOverRateMean(refs);
  return [...refs].sort((a, b) => {
    const devA = overRateDeviation(a, mean);
    const devB = overRateDeviation(b, mean);
    if (devB !== devA) return devB - devA;
    return (b.originVariance ?? 0) - (a.originVariance ?? 0);
  });
}

function spotlightHeroForTab(
  ref: RefProfile,
  tab: RefsDirectoryTab,
  league: LeagueConfig,
  overRateMean: number,
  overRateStdDev: number,
): {
  kicker: string;
  heroValue: string;
  heroLabel: string;
  heroTone: LeagueInsightTone;
  story: string;
} {
  const overPct = formatPct(ref.overRate);
  const underPct = formatPct(1 - ref.overRate);
  const scoreUnit = league.metrics.scoreUnitPlural;
  const rateTone = overRateHeroTone(ref.overRate, overRateMean, overRateStdDev);

  switch (tab) {
    case "over-high":
      return {
        kicker: "Highest over rate",
        heroValue: overPct,
        heroLabel: "Over rate",
        heroTone: rateTone === "negative" ? "neutral" : rateTone,
        story: `${ref.games} games logged · ${formatSigned(ref.totalPointsDelta)} ${scoreUnit} vs league avg.`,
      };
    case "over-low":
      return {
        kicker: "Highest under rate",
        heroValue: underPct,
        heroLabel: "Under rate",
        heroTone: rateTone === "positive" ? "neutral" : rateTone,
        story: `${overPct} over rate across ${ref.games} games · ${formatSigned(ref.totalPointsDelta)} ${scoreUnit} vs avg.`,
      };
    case "experienced":
      return {
        kicker: "Most experienced",
        heroValue: String(ref.games),
        heroLabel: "Games",
        heroTone: "neutral",
        story: `${overPct} over rate · ${ref.seasons.length} season${ref.seasons.length === 1 ? "" : "s"} tracked (${ref.seasons.slice(-2).join(", ")}).`,
      };
  }
}

export function buildRefsSpotlightCards(
  refs: RefProfile[],
  tab: RefsDirectoryTab,
  meta: RefsDirectoryMeta,
  league: LeagueConfig,
  basePath = "",
): LeagueInsightCard[] {
  const mean = computeOverRateMean(refs);
  const stdDev = populationStdDev(refs.map((ref) => ref.overRate));

  return selectSpotlightRefs(refs, tab).map((ref, index) => {
    const hero = spotlightHeroForTab(ref, tab, league, mean, stdDev);
    const deviation = overRateDeviation(ref, mean);
    const profileHref = `${basePath}/refs/${ref.slug}`;

    return {
      leagueId: league.id as LeagueId,
      label: league.label,
      shortLabel: league.shortLabel,
      kind: "ref-outlier",
      kicker: `#${index + 1} · ${hero.kicker}`,
      headline: ref.name,
      story: hero.story,
      heroValue: hero.heroValue,
      heroLabel: hero.heroLabel,
      heroTone: hero.heroTone,
      stats: [
        { label: "Games", value: String(ref.games) },
        { label: "Over rate", value: formatPct(ref.overRate) },
        {
          label: "Vs mean",
          value: `${formatSigned((ref.overRate - mean) * 100, 1)}pp`,
        },
        {
          label: "Deviation",
          value: `${formatSigned(deviation * 100, 1)}pp`,
        },
      ],
      links: [{ label: "Full profile", href: profileHref }],
      entityName: ref.name,
      entityHref: profileHref,
      refSlug: ref.slug,
    };
  });
}
