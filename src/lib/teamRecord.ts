import { getOfficialTeamRegularSeasonRecord } from "@/lib/team-record-query";
import { formatPct } from "@/lib/stats-utils";
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

export interface TeamDisplayRecordOptions {
  /** Include postseason games (NBA gameId prefix 004). Default false. */
  includePlayoffs?: boolean;
  /** Earliest season label inclusive (e.g. "2021-22"). */
  sinceSeason?: string;
}

/**
 * Team W-L for page display. NBA uses official regular-season standings;
 * NHL and playoff-inclusive NBA views use crew-split totals from the sample.
 */
export function getTeamDisplayRecord(
  league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb",
  teamAbbr: string,
  splits: TeamCrewSplit[],
  seasons: string[],
  options: TeamDisplayRecordOptions = {},
): TeamSampleRecord {
  if (league === "nba" && !options.includePlayoffs) {
    return getOfficialTeamRegularSeasonRecord(teamAbbr, seasons, options);
  }
  return getTeamSampleRecord(splits);
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
