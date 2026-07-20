import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { loadRuntimeGameLogs, type DataLeague } from "@/lib/game-logs";
import type { LeagueId } from "@/lib/leagues";

const DATA_LEAGUE_BY_ID: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nfl: "NFL",
  nhl: "NHL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
};

export type ResolvedGameForCrewIntelligence = {
  leagueId: LeagueId;
  game: RuntimeGameLogEntry;
};

export function resolveGameForCrewIntelligence(
  gameId: string,
  leagueId: LeagueId,
): ResolvedGameForCrewIntelligence | null {
  const dataLeague = DATA_LEAGUE_BY_ID[leagueId];
  if (!dataLeague) return null;

  const logs = loadRuntimeGameLogs(dataLeague);
  const game = logs?.games.find((entry) => entry.gameId === gameId);
  if (!game || game.officials.length === 0) return null;

  return { leagueId, game };
}
