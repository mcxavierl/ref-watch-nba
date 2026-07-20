import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import {
  buildRefTeamMatchupPayload,
  listRefTeamMatchupGamesFromEntries,
  type RefTeamMatchupInput,
} from "@/lib/ref-team-matchup-games-core";

export type { RefTeamMatchupInput } from "@/lib/ref-team-matchup-games-core";
export {
  buildRefTeamMatchupPayloadFromGames,
  listRefTeamMatchupGamesFromEntries,
} from "@/lib/ref-team-matchup-games-core";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
  mlb: "NBA",
};

/** Verified game logs where this ref worked a game involving the team. */
export function listRefTeamMatchupGames(
  dataLeague: DataLeague,
  refSlugValue: string,
  teamAbbr: string,
) {
  const logs = loadRuntimeGameLogs(dataLeague);
  return listRefTeamMatchupGamesFromEntries(
    logs?.games ?? [],
    refSlugValue,
    teamAbbr,
  );
}

export function buildRefTeamMatchupPayloadFromLogs(
  input: RefTeamMatchupInput,
): ReturnType<typeof buildRefTeamMatchupPayload> {
  const dataLeague = LEAGUE_ID_TO_DATA[input.leagueId];
  const logs = loadRuntimeGameLogs(dataLeague);
  return buildRefTeamMatchupPayload(input, logs?.games ?? []);
}
