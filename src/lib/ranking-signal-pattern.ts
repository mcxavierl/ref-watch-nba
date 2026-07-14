import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

export type RankingSignalPatternKind = "asymmetric" | "high-variance" | "stable";

/** Pill color tone: warning = asymmetric, notable = high-variance, neutral = stable. */
export type RankingSignalPatternTone = "warning" | "notable" | "neutral";

export interface RankingSignalPattern {
  kind: RankingSignalPatternKind;
  label: string;
  tone: RankingSignalPatternTone;
}

const HOME_ROAD_ASYMMETRIC_THRESHOLD: Partial<Record<LeagueId, number>> = {
  nhl: 0.4,
  nfl: 3,
  cfb: 3,
  epl: 0.35,
  laliga: 0.35,
};

const SCORING_HIGH_VARIANCE_THRESHOLD: Partial<Record<LeagueId, number>> = {
  nhl: 0.5,
  nfl: 2,
  cfb: 2,
  epl: 0.4,
  laliga: 0.4,
  cbb: 2,
  nba: 2,
};

const WHISTLE_HIGH_VARIANCE_THRESHOLD: Partial<Record<LeagueId, number>> = {
  nhl: 0.8,
  nfl: 2,
  cfb: 2,
};

function balanceKindFor(
  ref: RefProfile,
): "balancer" | "asymmetric" | "neutral" | undefined {
  return (
    ref.nflAnalytics?.balanceKind ??
    ref.cfbAnalytics?.balanceKind ??
    ref.nhlAnalytics?.balanceKind ??
    ref.eplAnalytics?.balanceKind
  );
}

function homeRoadGap(ref: RefProfile): number {
  if (!ref.bettingStats) return 0;
  return Math.abs(ref.bettingStats.avgHomeScore - ref.bettingStats.avgRoadScore);
}

function whistleDeltaFor(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  if (leagueId === "nfl" || leagueId === "cfb") {
    return ref.nflAnalytics?.flagsDelta ?? ref.cfbAnalytics?.flagsDelta ?? ref.foulsDelta;
  }
  if (leagueId === "epl" || leagueId === "laliga") {
    return ref.eplAnalytics?.foulsDelta ?? ref.foulsDelta;
  }
  return ref.foulsDelta;
}

/**
 * Classify an official's ranking-table row into one primary visual pattern:
 * asymmetric (home/road or team-balance skew), high-variance (large deltas or
 * multiple notable signals), or stable (nothing standing out).
 */
export function classifyRankingSignalPattern(
  ref: RefProfile,
  leagueId: LeagueId,
  signalCount: number,
): RankingSignalPattern {
  const balanceKind = balanceKindFor(ref);
  const homeRoadThreshold = HOME_ROAD_ASYMMETRIC_THRESHOLD[leagueId] ?? 3;
  const isAsymmetric =
    balanceKind === "asymmetric" || homeRoadGap(ref) >= homeRoadThreshold;

  if (isAsymmetric) {
    return { kind: "asymmetric", label: "Asymmetric", tone: "warning" };
  }

  const scoringThreshold = SCORING_HIGH_VARIANCE_THRESHOLD[leagueId] ?? 1.5;
  const whistleThreshold = WHISTLE_HIGH_VARIANCE_THRESHOLD[leagueId] ?? 2;
  const isHighVariance =
    Math.abs(ref.totalPointsDelta) >= scoringThreshold ||
    Math.abs(whistleDeltaFor(ref, leagueId)) >= whistleThreshold ||
    signalCount >= 2;

  if (isHighVariance) {
    return { kind: "high-variance", label: "High Variance", tone: "notable" };
  }

  return { kind: "stable", label: "Stable", tone: "neutral" };
}
