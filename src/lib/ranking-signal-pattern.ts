import { qualifiesRefAnomaly } from "@/lib/anomaly-surface";
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
  if (!qualifiesRefAnomaly(ref, leagueId, signalCount)) {
    return { kind: "stable", label: "Stable", tone: "neutral" };
  }

  const balanceKind = balanceKindFor(ref);
  const homeRoadThreshold = HOME_ROAD_ASYMMETRIC_THRESHOLD[leagueId] ?? 3;
  const isAsymmetric =
    balanceKind === "asymmetric" || homeRoadGap(ref) >= homeRoadThreshold;

  if (isAsymmetric) {
    return { kind: "asymmetric", label: "Asymmetric", tone: "warning" };
  }

  return { kind: "high-variance", label: "Anomaly", tone: "notable" };
}
