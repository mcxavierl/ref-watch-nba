import type { LeagueId } from "@/lib/leagues";
import type {
  DataLeague,
  RuntimeGameLogFile,
} from "@/lib/game-logs-preload";
import {
  buildRefTeamMatchupPayload,
  type RefTeamMatchupInput,
} from "@/lib/ref-team-matchup-games-core";

const GAME_LOG_GLOBAL_KEYS = {
  NBA: "__REFWATCH_NBA_GAME_LOGS__",
  NHL: "__REFWATCH_NHL_GAME_LOGS__",
  NFL: "__REFWATCH_NFL_GAME_LOGS__",
  EPL: "__REFWATCH_EPL_GAME_LOGS__",
  LALIGA: "__REFWATCH_LALIGA_GAME_LOGS__",
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
  WNBA: "__REFWATCH_WNBA_GAME_LOGS__",
} as const satisfies Record<DataLeague, string>;

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

function readClientGameLogs(dataLeague: DataLeague): RuntimeGameLogFile | null {
  const key = GAME_LOG_GLOBAL_KEYS[dataLeague];
  return (
    (globalThis as unknown as Record<string, RuntimeGameLogFile | undefined>)[key] ??
    null
  );
}

export function buildClientRefTeamMatchupPayload(input: RefTeamMatchupInput) {
  const dataLeague = LEAGUE_ID_TO_DATA[input.leagueId];
  const logs = readClientGameLogs(dataLeague);
  return buildRefTeamMatchupPayload(input, logs?.games ?? []);
}

export type { RefTeamMatchupInput } from "@/lib/ref-team-matchup-games-core";
