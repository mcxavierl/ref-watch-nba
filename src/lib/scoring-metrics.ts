import { formatSigned } from "@/lib/stats-utils";

/** Percent above/below league average scoring (amplifies low-variance leagues like NHL). */
export function scoringVsLeaguePct(
  avgTotal: number,
  leagueAvg: number,
): number {
  if (!Number.isFinite(avgTotal) || !Number.isFinite(leagueAvg) || leagueAvg <= 0) {
    return 0;
  }
  return ((avgTotal / leagueAvg) - 1) * 100;
}

/** Percent above/below league average for whistle/penalty volume. */
export function whistleVsLeaguePct(
  avgWhistle: number,
  leagueAvg: number,
): number {
  return scoringVsLeaguePct(avgWhistle, leagueAvg);
}

export function formatPctVsLeague(pct: number, decimals = 1): string {
  if (Math.abs(pct) < 0.05) return `${(0).toFixed(decimals)}%`;
  return `${formatSigned(pct, decimals)}%`;
}

/** Use % for low-variance leagues; absolute delta for NBA-scale scoring. */
export function usePctScoringDelta(leagueAvgTotal: number): boolean {
  return leagueAvgTotal < 25;
}

export function directoryScoringDisplay(
  ref: { avgTotalPoints: number; totalPointsDelta: number },
  leagueAvgTotal: number,
): { value: number; formatted: string; usePct: boolean } {
  const usePct = usePctScoringDelta(leagueAvgTotal);
  if (usePct) {
    const pct = scoringVsLeaguePct(ref.avgTotalPoints, leagueAvgTotal);
    return { value: pct, formatted: formatPctVsLeague(pct), usePct: true };
  }
  return {
    value: ref.totalPointsDelta,
    formatted: formatSigned(ref.totalPointsDelta),
    usePct: false,
  };
}

export function directoryWhistleDisplay(
  delta: number,
  avgWhistle: number,
  leagueAvgWhistle: number,
): { value: number; formatted: string; usePct: boolean } {
  const usePct = usePctScoringDelta(leagueAvgWhistle);
  if (usePct) {
    const pct = whistleVsLeaguePct(avgWhistle, leagueAvgWhistle);
    return { value: pct, formatted: formatPctVsLeague(pct), usePct: true };
  }
  return {
    value: delta,
    formatted: formatSigned(delta),
    usePct: false,
  };
}
