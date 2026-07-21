import { GSNI_THRESHOLD } from "@/lib/gsni";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

/** Primary variance gate: |score| must exceed 1.0 to surface as an anomaly. */
export const ANOMALY_VARIANCE_THRESHOLD = GSNI_THRESHOLD;

/** Stronger gate for rankings "Anomalies only" (roughly 2σ-style vs league averages). */
export const ANOMALY_STRONG_SCORE_THRESHOLD = ANOMALY_VARIANCE_THRESHOLD * 2;

export const NO_ANOMALIES_DETECTED_COPY =
  "No anomalies detected. Broaden your filter to see league-average profiles.";

export function qualifiesAnomalyScore(
  score: number | null | undefined,
  threshold = ANOMALY_VARIANCE_THRESHOLD,
): boolean {
  return (
    score !== null &&
    score !== undefined &&
    Number.isFinite(score) &&
    Math.abs(score) > threshold
  );
}

export function sortByAbsDeviation<T>(
  items: readonly T[],
  readScore: (item: T) => number | null | undefined,
): T[] {
  return [...items].sort((a, b) => {
    const aScore = Math.abs(readScore(a) ?? -1);
    const bScore = Math.abs(readScore(b) ?? -1);
    if (bScore !== aScore) return bScore - aScore;
    return 0;
  });
}

function whistleDelta(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  if (leagueId === "nfl") return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
  return ref.foulsDelta;
}

/** Composite deviation score for ranking/directory interestingness sort. */
export function refInterestingnessScore(ref: RefProfile, leagueId: LeagueId): number {
  const scoring = Math.abs(ref.totalPointsDelta);
  const whistle = Math.abs(whistleDelta(ref, leagueId));
  const overTilt = Math.abs(ref.overRate - 0.5) * 10;
  return Math.max(scoring, whistle, overTilt);
}

export function sortRefsByInterestingness(
  refs: RefProfile[],
  leagueId: LeagueId,
): RefProfile[] {
  return [...refs].sort(
    (a, b) =>
      refInterestingnessScore(b, leagueId) - refInterestingnessScore(a, leagueId) ||
      a.name.localeCompare(b.name),
  );
}

export function qualifiesRefAnomaly(
  ref: RefProfile,
  leagueId: LeagueId,
  notableSignalCount = 0,
): boolean {
  const score = refInterestingnessScore(ref, leagueId);
  if (notableSignalCount >= 2) return true;
  if (notableSignalCount >= 1 && score >= ANOMALY_STRONG_SCORE_THRESHOLD) {
    return true;
  }
  return score >= ANOMALY_STRONG_SCORE_THRESHOLD * 1.25;
}
