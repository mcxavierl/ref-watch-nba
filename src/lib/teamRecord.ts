import {
  gameCountFromCrewSplits,
  getTeamRecordFromLogs,
} from "@/lib/game-count";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { getOfficialTeamRegularSeasonRecord } from "@/lib/team-record-query";
import { formatPct } from "@/lib/stats-utils";
import type { TeamCrewSplit } from "@/lib/types";

const LEAGUE_DATA_MAP = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
} as const;

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

export interface TeamDisplayRecordOptions {
  /** Include postseason games (NBA gameId prefix 004). Default false. */
  includePlayoffs?: boolean;
  /** Earliest season label inclusive (e.g. "2021-22"). */
  sinceSeason?: string;
}

/**
 * Team W-L for page display. NBA uses official regular-season standings when
 * available; all leagues prefer DISTINCT game_id totals from logs over crew splits.
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

  const dataLeague = LEAGUE_DATA_MAP[league];
  const logs = loadRuntimeGameLogs(dataLeague);
  if (logs?.games?.length) {
    const fromLogs = getTeamRecordFromLogs(logs.games, teamAbbr, seasons);
    if (fromLogs.games > 0) return fromLogs;
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
