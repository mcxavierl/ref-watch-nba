import type { OuLean } from "@/lib/types";

/** Pure stat helpers safe for client components (no Node APIs). */

export function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}`;
}

/** e.g. "+4.2 pts vs team" */
export function formatWinRateVsTeam(
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
