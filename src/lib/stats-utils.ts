import type { OuLean, RefBettingStats } from "@/lib/types";

/** Pure stat helpers safe for client components (no Node APIs). */

function wlpRate(record: { wins: number; losses: number; pushes: number }): number | null {
  const decisions = record.wins + record.losses + record.pushes;
  if (decisions === 0) return null;
  return record.wins / decisions;
}

export function bettingAtsRate(stats: RefBettingStats | undefined): number | null {
  if (!stats?.linesAvailable) return null;
  return wlpRate(stats.homeTeamAts);
}

export function bettingOuRate(stats: RefBettingStats | undefined): number | null {
  if (!stats?.linesAvailable) return null;
  return wlpRate(stats.overUnder.overall);
}

export function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Team/matrix baselines with zero games must read "n/a", not "0.0%". */
export function formatBaselinePct(baselineGames: number, winRate: number): string {
  return baselineGames > 0 ? formatPct(winRate) : "n/a";
}

/** ATS cover rate; zero lined games read "n/a". */
export function formatBaselineAtsPct(atsGames: number, coverRate: number): string {
  return atsGames > 0 ? formatPct(coverRate) : "n/a";
}

/** Signed delta with fixed decimal precision (avoids float display artifacts). */
export function formatSigned(n: number, decimals = 1): string {
  const formatted = n.toFixed(decimals);
  return n >= 0 ? `+${formatted}` : formatted;
}

/**
 * Whistle edge from the team's perspective: opponent volume minus team volume.
 * JSON stores team−opponent historically; positive here means the team is whistled less.
 */
export function teamWhistleEdge(storedTeamMinusOpponent: number): number {
  return Math.round(-storedTeamMinusOpponent * 10) / 10;
}

/**
 * Human-readable team whistle edge, e.g. "2.3 fewer flags on Ravens".
 * Positive edge means fewer whistles on the team; negative means more.
 */
export function formatTeamWhistleEdgeLabel(
  edge: number,
  teamLabel: string,
  whistleUnit: string,
): string {
  const rounded = Math.round(edge * 10) / 10;
  const magnitude = Math.abs(rounded);
  if (magnitude < 0.05) {
    return `Even ${whistleUnit} on ${teamLabel}`;
  }
  const direction = rounded > 0 ? "fewer" : "more";
  const amount = Number.isInteger(magnitude)
    ? String(magnitude)
    : magnitude.toFixed(1);
  return `${amount} ${direction} ${whistleUnit} on ${teamLabel}`;
}

/** e.g. "+4.2 pts vs team" */
export function formatWinRateVsTeam(
  rate: number,
  teamBaseline: number,
): string {
  const delta = Math.round((rate - teamBaseline) * 1000) / 10;
  return `${formatSigned(delta)} pts vs team`;
}

/** e.g. "+4.2 pts vs team baseline (ATS)" */
export function formatCoverRateVsTeam(
  rate: number,
  teamBaseline: number,
): string {
  const delta = Math.round((rate - teamBaseline) * 1000) / 10;
  return `${formatSigned(delta)} pts vs team`;
}

export function whistleBias(
  foulDifferential: number,
): "team" | "opponent" | "neutral" {
  if (foulDifferential >= 1.5) return "team";
  if (foulDifferential <= -1.5) return "opponent";
  return "neutral";
}

export function computeOuLean(
  overRate: number,
  avgTotal: number,
  leagueAvg: number,
): OuLean {
  const delta = avgTotal - leagueAvg;
  if (overRate >= 0.56 || delta >= 3) return "over";
  if (overRate <= 0.44 || delta <= -3) return "under";
  return "neutral";
}

export function ouLeanSortWeight(lean: OuLean): number {
  if (lean === "over") return 2;
  if (lean === "under") return 1;
  return 0;
}
