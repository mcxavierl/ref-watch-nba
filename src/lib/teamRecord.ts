import type { TeamCrewSplit } from "@/lib/types";

export interface TeamSampleRecord {
  wins: number;
  losses: number;
  games: number;
  winRate: number;
}

/** Sum W-L across crew splits; each game belongs to exactly one crew bucket. */
export function getTeamSampleRecord(splits: TeamCrewSplit[]): TeamSampleRecord {
  const wins = splits.reduce((sum, split) => sum + split.wins, 0);
  const losses = splits.reduce((sum, split) => sum + split.losses, 0);
  const games = wins + losses;
  return {
    wins,
    losses,
    games,
    winRate: games > 0 ? wins / games : 0,
  };
}

/** Point difference vs team baseline (percentage points). */
export function winRateDeltaPoints(
  rate: number,
  teamBaseline: number,
): number {
  return Math.round((rate - teamBaseline) * 1000) / 10;
}
