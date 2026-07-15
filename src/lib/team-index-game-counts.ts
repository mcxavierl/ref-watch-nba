import type { DataLeague } from "@/lib/game-logs";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import {
  buildTeamGameCountMap,
  countTeamGamesFromLogs,
  gameCountFromCrewSplits,
} from "@/lib/game-count";
import { leagueTenSeasons } from "@/lib/league-seasons";
import type { LeagueId } from "@/lib/leagues";
import type { TeamCrewSplit } from "@/lib/types";

const LEAGUE_DATA_MAP: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

function gameLogRowsForLeague(leagueId: LeagueId) {
  const dataLeague = LEAGUE_DATA_MAP[leagueId];
  if (!dataLeague) return [];
  return loadRuntimeGameLogs(dataLeague)?.games ?? [];
}

/** DISTINCT game_id counts per team for the league's default ten-season window. */
export function loadTeamIndexGameCounts(
  leagueId: LeagueId,
): Map<string, number> {
  const rows = gameLogRowsForLeague(leagueId);
  if (rows.length === 0) return new Map();
  return buildTeamGameCountMap(rows, leagueTenSeasons(leagueId));
}

/** Team index subtitle game count: logs first, crew-split W-L fallback. */
export function teamIndexGameCount(
  leagueId: LeagueId,
  teamAbbr: string,
  splits: TeamCrewSplit[],
  counts?: Map<string, number>,
): number {
  const key = teamAbbr.toUpperCase();
  const fromLogs = counts?.get(key);
  if (fromLogs !== undefined && fromLogs > 0) return fromLogs;
  const rows = gameLogRowsForLeague(leagueId);
  if (rows.length > 0) {
    return countTeamGamesFromLogs(rows, key, leagueTenSeasons(leagueId));
  }
  return gameCountFromCrewSplits(splits);
}
