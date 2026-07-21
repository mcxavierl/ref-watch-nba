import type { InsightDrilldownPayload } from "@/lib/insight-drilldown-types";
import { isGameLogsPayload } from "@/lib/json-asset-guards";
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

const GAME_LOG_ASSET_PATHS = {
  NBA: "/data/nba/game-logs.json",
  NHL: "/data/nhl/game-logs.json",
  NFL: "/data/nfl/game-logs.json",
  EPL: "/data/epl/game-logs.json",
  LALIGA: "/data/laliga/game-logs.json",
  CBB: "/data/cbb/game-logs.json",
  CFB: "/data/cfb/game-logs.json",
  WNBA: "/data/wnba/game-logs.json",
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

const gameLogCache = new Map<DataLeague, RuntimeGameLogFile>();
const payloadCache = new Map<string, InsightDrilldownPayload>();

function readClientGameLogs(dataLeague: DataLeague): RuntimeGameLogFile | null {
  const cached = gameLogCache.get(dataLeague);
  if (cached) return cached;

  const key = GAME_LOG_GLOBAL_KEYS[dataLeague];
  return (
    (globalThis as unknown as Record<string, RuntimeGameLogFile | undefined>)[key] ??
    null
  );
}

function matchupPayloadCacheKey(input: RefTeamMatchupInput): string {
  return [
    input.leagueId,
    input.refSlug,
    input.teamAbbr.toUpperCase(),
    input.recordWins ?? "",
    input.recordLosses ?? "",
    input.baselineWinRate,
  ].join("--");
}

export function buildClientRefTeamMatchupPayload(input: RefTeamMatchupInput) {
  const dataLeague = LEAGUE_ID_TO_DATA[input.leagueId];
  const logs = readClientGameLogs(dataLeague);
  return buildRefTeamMatchupPayload(input, logs?.games ?? []);
}

async function fetchClientGameLogs(
  dataLeague: DataLeague,
): Promise<RuntimeGameLogFile | null> {
  const cached = gameLogCache.get(dataLeague);
  if (cached) return cached;

  const hydrated = readClientGameLogs(dataLeague);
  if (hydrated?.games?.length) {
    gameLogCache.set(dataLeague, hydrated);
    return hydrated;
  }

  try {
    const res = await fetch(GAME_LOG_ASSET_PATHS[dataLeague], {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isGameLogsPayload(data) || data.games.length === 0) return null;
    const logs = data as RuntimeGameLogFile;
    gameLogCache.set(dataLeague, logs);
    return logs;
  } catch {
    return null;
  }
}

export async function fetchRefTeamMatchupPayload(
  input: RefTeamMatchupInput,
): Promise<InsightDrilldownPayload | null> {
  const cacheKey = matchupPayloadCacheKey(input);
  const cached = payloadCache.get(cacheKey);
  if (cached) return cached;

  const dataLeague = LEAGUE_ID_TO_DATA[input.leagueId];
  const logs = await fetchClientGameLogs(dataLeague);
  const payload = buildRefTeamMatchupPayload(input, logs?.games ?? []);
  if (payload) payloadCache.set(cacheKey, payload);
  return payload;
}

export type { RefTeamMatchupInput } from "@/lib/ref-team-matchup-games-core";
