import { gameCountFromCrewSplits } from "@/lib/game-count";
import { formatPct } from "@/lib/stats-utils";
import type { TeamCrewSplit } from "@/lib/types";

export interface TeamSampleRecord {
  wins: number;
  losses: number;
  games: number;
  winRate: number;
}

/** Sum W-L across crew splits (ref buckets overlap; prefer getTeamRecordFromLogs). */
export function getTeamSampleRecord(splits: TeamCrewSplit[]): TeamSampleRecord {
  const wins = splits.reduce((sum, split) => sum + split.wins, 0);
  const losses = splits.reduce((sum, split) => sum + split.losses, 0);
  const games = gameCountFromCrewSplits(splits);
  return {
    wins,
    losses,
    games,
    winRate: games > 0 ? wins / games : 0,
  };
}

/** Human-readable W-L (pct) for team baselines; avoids misleading 0-0 (0.0%). */
export function formatTeamSampleRecord(record: TeamSampleRecord): string {
  if (record.games <= 0) return "n/a";
  return `${record.wins}-${record.losses} (${formatPct(record.winRate)})`;
}

/** Point difference vs team baseline (percentage points). */
export function winRateDeltaPoints(
  rate: number,
  teamBaseline: number,
): number {
  return Math.round((rate - teamBaseline) * 1000) / 10;
}
