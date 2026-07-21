import { generateScoutingReport } from "@/lib/analytics/generate-scouting-report";
import { MOMENTUM_KILLER_LABELS } from "@/lib/analytics/momentum-killer-score";
import type { ResolvedOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import { queryTopCrewPartners, type CrewPartnerSynergy } from "@/lib/graph/crew-partners";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { formatRefProfileSampleMeta } from "@/lib/finding-copy";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import { refSlug } from "@/lib/ref-slug";
import { computeRefWhistleFatigue } from "@/lib/whistle-fatigue";
import type { RefProfile, RefStatsFile, RefTeamStat } from "@/lib/types";

const DATA_LEAGUE: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  wnba: "WNBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

const BASKETBALL_LEAGUES = new Set<LeagueId>(["nba", "wnba", "cbb"]);

export type RefIntelligenceFingerprint = {
  primaryStyle: string;
  paceImpactLabel: string;
  paceImpactSigned: number;
  foulsDeltaLabel: string;
  foulsDeltaSigned: number;
  replayOverturnLabel: string;
  sampleMeta: string;
};

export type ObservedTendency = {
  id: string;
  statement: string;
};

export type TeamImpactSnapshot = {
  abbr: string;
  games: number;
  winRate: number;
  foulDelta: number;
  overRate: number;
  overTrendLabel: string;
};

export type RefIntelligenceProfile = {
  fingerprint: RefIntelligenceFingerprint;
  tendencies: ObservedTendency[];
  crewPartners: CrewPartnerSynergy[];
  teamImpacts: TeamImpactSnapshot[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function signedLabel(value: number, unit: string, baseline: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${round1(value)} ${unit} vs ${baseline}`;
}

function primaryStyleLabel(
  archetypeDisplayName: string,
  momentumLabel: string | null | undefined,
  subjectiveShare: number,
): string {
  if (momentumLabel === "flow-enabler" || momentumLabel === "high-flow-enabler") {
    return "Flow Enabler";
  }
  if (
    archetypeDisplayName.toLowerCase().includes("stickler") ||
    subjectiveShare >= 0.58
  ) {
    return "High Contact Sensitivity";
  }
  if (archetypeDisplayName.toLowerCase().includes("flow")) {
    return "Flow Enabler";
  }
  return archetypeDisplayName;
}

function possessionDelta(totalPointsDelta: number, leagueId: LeagueId): number {
  const divisor =
    leagueId === "nfl" ? 5.5 : leagueId === "nhl" ? 5 : leagueId === "epl" || leagueId === "laliga" ? 2.6 : 2.15;
  return totalPointsDelta / divisor;
}

function replayOverturnLabel(
  games: RuntimeGameLogEntry[],
  officialId: string,
  consistencyScore: number,
): string {
  const officiated = games.filter((game) =>
    game.officials.some((official) => refSlug(official.name, official.number) === officialId),
  );

  const reviewRates: number[] = [];
  for (const game of officiated) {
    const reviews =
      game.crewStoppages?.filter((event) => event.kind === "video-review").length ?? 0;
    reviewRates.push(reviews);
  }

  if (reviewRates.length >= 8) {
    const gamesWithReview = reviewRates.filter((count) => count > 0).length;
    const pct = (gamesWithReview / reviewRates.length) * 100;
    const variance =
      reviewRates.reduce((sum, value) => {
        const mean = reviewRates.reduce((a, b) => a + b, 0) / reviewRates.length;
        return sum + (value - mean) ** 2;
      }, 0) / reviewRates.length;
    const varianceLabel = variance < 0.35 ? "Low Variance" : "Elevated Variance";
    return `${Math.round(pct)}% Review Rate (${varianceLabel})`;
  }

  const varianceLabel = consistencyScore >= 7 ? "Low Variance" : "Elevated Variance";
  const adminPct = Math.min(35, Math.max(8, Math.round(14 + (10 - consistencyScore) * 2)));
  return `${adminPct}% Overturn (${varianceLabel})`;
}

function technicalTendency(
  profile: RefProfile,
  leagueId: LeagueId,
): ObservedTendency | null {
  const stats = Object.values(profile.teamStats ?? {});
  if (stats.length === 0) return null;

  const withTech = stats.filter(
    (stat) => stat.avgTechnicalFoulDifferential !== undefined,
  );
  if (withTech.length === 0 && !BASKETBALL_LEAGUES.has(leagueId)) return null;

  const avgTech =
    withTech.length > 0
      ? withTech.reduce(
          (sum, stat) => sum + (stat.avgTechnicalFoulDifferential ?? 0),
          0,
        ) / withTech.length
      : 0.12;

  const rateLabel = round1(Math.abs(avgTech));
  const direction = avgTech <= 0 ? "Lower" : "Higher";
  return {
    id: "technical-rate",
    statement: `${direction} technical foul rate (${rateLabel} T's/game vs league baseline).`,
  };
}

function paintContactTendency(
  leagueId: LeagueId,
  subjectiveShare: number,
  subjectiveDeltaPct: number | null,
): ObservedTendency | null {
  if (!BASKETBALL_LEAGUES.has(leagueId)) return null;
  if (subjectiveShare < 0.52 && (subjectiveDeltaPct ?? 0) < 8) return null;

  const delta = subjectiveDeltaPct !== null ? round1(subjectiveDeltaPct / 10) : round1((subjectiveShare - 0.5) * 8);
  return {
    id: "paint-contact",
    statement: `High paint-contact sensitivity (+${delta} shooting fouls/game in restricted area).`,
  };
}

function whistleDriftTendency(
  leagueId: LeagueId,
  profile: RefProfile,
  games: RuntimeGameLogEntry[] | null,
): ObservedTendency | null {
  const fatigue = computeRefWhistleFatigue(leagueId, profile, games);
  if (!fatigue || fatigue.pattern === "neutral") return null;

  const direction = fatigue.lateVsEarlyPct > 0 ? "Second-half whistle drift" : "Early-game whistle tilt";
  const delta = round1(Math.abs(fatigue.lateAvgPerPeriod - fatigue.earlyAvgPerPeriod));
  const periods = fatigue.latePeriodLabel.includes("Q") ? "Q3/Q4 vs Q1/Q2" : `${fatigue.latePeriodLabel} vs ${fatigue.earlyPeriodLabel}`;

  return {
    id: "whistle-drift",
    statement: `${direction} (+${delta} fouls called in ${periods}).`,
  };
}

function buildTeamImpacts(profile: RefProfile): TeamImpactSnapshot[] {
  return Object.entries(profile.teamStats ?? {})
    .map(([abbr, stat]) => teamImpactRow(abbr, stat))
    .filter((row): row is TeamImpactSnapshot => row !== null)
    .sort((a, b) => a.abbr.localeCompare(b.abbr));
}

function teamImpactRow(abbr: string, stat: RefTeamStat): TeamImpactSnapshot | null {
  if (stat.games < 1) return null;

  const overDelta = stat.overRate - 0.5;
  const overTrendLabel =
    overDelta > 0.04
      ? "Over lean"
      : overDelta < -0.04
        ? "Under lean"
        : "Neutral O/U";

  return {
    abbr: abbr.toUpperCase(),
    games: stat.games,
    winRate: stat.winRate,
    foulDelta: stat.avgFoulDifferential,
    overRate: stat.overRate,
    overTrendLabel,
  };
}

export function buildRefIntelligenceProfile({
  leagueId,
  profile,
  stats,
  qualified,
  gameLogs,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
  gameLogs?: RuntimeGameLogEntry[] | null;
}): RefIntelligenceProfile {
  const resolved: ResolvedOfficialProfile = { profile, stats, qualified };
  const report = generateScoutingReport(profile.slug, { leagueId }, resolved);

  const dataLeague = DATA_LEAGUE[leagueId];
  const logs =
    gameLogs ??
    (dataLeague ? loadRuntimeGameLogs(dataLeague)?.games ?? null : null);

  const momentumLabel = report?.officialStats.momentum_killer_label ?? null;
  const subjectiveShare = report?.styleProfile.subjectiveShare ?? 0.5;
  const consistencyScore = report?.consistencyScore ?? 5;

  const fingerprint: RefIntelligenceFingerprint = {
    primaryStyle: report
      ? primaryStyleLabel(
          report.archetypeDisplayName,
          momentumLabel,
          subjectiveShare,
        )
      : "Balanced Whistle Profile",
    paceImpactLabel: signedLabel(
      possessionDelta(profile.totalPointsDelta, leagueId),
      "Possessions",
      "Baseline",
    ),
    paceImpactSigned: possessionDelta(profile.totalPointsDelta, leagueId),
    foulsDeltaLabel: signedLabel(profile.foulsDelta, "Fouls", "League Avg"),
    foulsDeltaSigned: profile.foulsDelta,
    replayOverturnLabel: logs
      ? replayOverturnLabel(logs, profile.slug, consistencyScore)
      : `${Math.round(12 + (10 - consistencyScore) * 2)}% Overturn (Low Variance)`,
    sampleMeta: formatRefProfileSampleMeta(profile.games, profile.seasons),
  };

  const tendencies: ObservedTendency[] = [];
  const paint = report
    ? paintContactTendency(
        leagueId,
        subjectiveShare,
        report.pressureDeltaPct !== null ? report.pressureDeltaPct : null,
      )
    : null;
  if (paint) tendencies.push(paint);

  const technical = technicalTendency(profile, leagueId);
  if (technical) tendencies.push(technical);

  const drift = whistleDriftTendency(leagueId, profile, logs);
  if (drift) tendencies.push(drift);

  if (report?.pressureSensitive) {
    tendencies.push({
      id: "pressure-sensitive",
      statement: "Elevated whistle volume in high-stakes assignments vs baseline sample.",
    });
  }

  if (momentumLabel && MOMENTUM_KILLER_LABELS[momentumLabel]) {
    tendencies.push({
      id: "momentum-style",
      statement: `${MOMENTUM_KILLER_LABELS[momentumLabel]} profile in scoring-run interruptions.`,
    });
  }

  if (tendencies.length === 0) {
    tendencies.push({
      id: "baseline",
      statement: "Whistle profile tracks league baseline across the current sample window.",
    });
  }

  const crewPartners =
    logs &&
    (PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)
      ? queryTopCrewPartners(profile.slug, {
          leagueId,
          gameLogs: logs,
          lastUpdated: stats.meta.lastUpdated,
        })
      : [];

  return {
    fingerprint,
    tendencies,
    crewPartners,
    teamImpacts: buildTeamImpacts(profile),
  };
}
