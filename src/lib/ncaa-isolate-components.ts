import { safeOriginJson } from "@/lib/edge-fetch";
import {
  getCachedGameLogs,
  setCachedGameLogs,
  type RuntimeGameLogEntry,
  type RuntimeGameLogFile,
} from "@/lib/game-logs-preload";
import { isGameLogsPayload, normalizeAppPathname } from "@/lib/json-asset-guards";
import { applyNcaaPipelineVerificationMeta } from "@/lib/ncaa-pipeline";
import { getCachedRefStats, setCachedRefStats } from "@/lib/ref-stats-preload";
import { teamsByConference as cbbTeamsByConference } from "@/lib/cbb/teams";
import { teamsByConference as cfbTeamsByConference } from "@/lib/cfb/teams";
import {
  clearNcaaSportComponents,
  freezeWorkerConfig,
  getWorkerIsolateStore,
  releaseParsedPayload,
  type NcaaConferenceMap,
  type NcaaGameShardMap,
  type NcaaSportComponents,
} from "@/lib/worker-isolate-store";

export type {
  NcaaConferenceMap,
  NcaaGameShardMap,
  NcaaSportComponents,
} from "@/lib/worker-isolate-store";
export { clearNcaaSportComponents } from "@/lib/worker-isolate-store";
export type NcaaSportLeague = "CBB" | "CFB";
type NcaaRouteLeague = "cbb" | "cfb";

const NCAA_GAME_LOG_ASSET = freezeWorkerConfig({
  cbb: "/data/cbb/game-logs.json",
  cfb: "/data/cfb/game-logs.json",
} as const);

const ROUTE_TO_SPORT: Record<NcaaRouteLeague, NcaaSportLeague> = {
  cbb: "CBB",
  cfb: "CFB",
};

const ROUTE_TO_DATA_LEAGUE = freezeWorkerConfig({
  cbb: "CBB",
  cfb: "CFB",
} as const);

function conferenceMapFromRegistry(league: NcaaRouteLeague): NcaaConferenceMap {
  const grouped =
    league === "cbb" ? cbbTeamsByConference() : cfbTeamsByConference();
  const map: NcaaConferenceMap = new Map();
  for (const [conference, teams] of Object.entries(grouped)) {
    const abbrs = teams.map((team) => team.abbr);
    if (abbrs.length > 0) {
      map.set(conference, abbrs);
    }
  }
  return map;
}

export function isHydratableConferenceMap(map: NcaaConferenceMap): boolean {
  return map.size > 0;
}

export function isHydratableGameLogFile(
  file: RuntimeGameLogFile | null | undefined,
): file is RuntimeGameLogFile {
  return Boolean(file?.games?.length);
}

export function shardGamesBySeason(
  games: RuntimeGameLogEntry[],
): NcaaGameShardMap {
  const shards: NcaaGameShardMap = new Map();
  for (const game of games) {
    const season = game.season?.trim() || "unknown";
    const bucket = shards.get(season);
    if (bucket) {
      bucket.push(game);
    } else {
      shards.set(season, [game]);
    }
  }
  return shards;
}

export function getNcaaBasketballComponents(): NcaaSportComponents | null {
  return getWorkerIsolateStore().ncaaBasketballComponents ?? null;
}

export function getNcaaFootballComponents(): NcaaSportComponents | null {
  return getWorkerIsolateStore().ncaaFootballComponents ?? null;
}

function getStoreSlot(
  league: NcaaRouteLeague,
): "ncaaBasketballComponents" | "ncaaFootballComponents" {
  return league === "cbb" ? "ncaaBasketballComponents" : "ncaaFootballComponents";
}

export function setNcaaSportComponents(
  league: NcaaRouteLeague,
  components: NcaaSportComponents | null,
): void {
  const store = getWorkerIsolateStore();
  const slot = getStoreSlot(league);
  if (components === null) {
    clearNcaaSportComponents(store[slot]);
    store[slot] = null;
    return;
  }
  store[slot] = components;
}

async function fetchJsonAsset(assetPath: string): Promise<unknown | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const assets = env.ASSETS as
      | { fetch: (input: RequestInfo) => Promise<Response> }
      | undefined;
    if (!assets) return null;
    const res = await assets.fetch(`https://assets.local${assetPath}`);
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function fetchGameLogFile(
  origin: string,
  league: NcaaRouteLeague,
): Promise<RuntimeGameLogFile | null> {
  const assetPath = NCAA_GAME_LOG_ASSET[league];
  let payload: unknown =
    (await fetchJsonAsset(assetPath)) ??
    (await safeOriginJson(origin, assetPath));

  if (!isGameLogsPayload(payload) || payload.games.length === 0) {
    payload = releaseParsedPayload(payload);
    return null;
  }

  const file = payload as RuntimeGameLogFile;
  payload = releaseParsedPayload(payload);
  return file;
}

function buildComponents(
  league: NcaaRouteLeague,
  conferenceMap: NcaaConferenceMap,
  gameFile: RuntimeGameLogFile,
): NcaaSportComponents {
  return {
    league: ROUTE_TO_SPORT[league],
    conferenceMap,
    gameShards: shardGamesBySeason(gameFile.games),
    meta: {
      lastUpdated: gameFile.lastUpdated ?? null,
      source: gameFile.source ?? null,
      totalGames: gameFile.games.length,
    },
  };
}

/**
 * Hydrate request-scoped NCAA conference maps + season game shards.
 * Bails out without writing to the isolate store when shards are empty.
 */
export async function preloadNcaaSportComponents(
  origin: string,
  league: NcaaRouteLeague,
): Promise<boolean> {
  if (!origin?.trim()) return false;

  const store = getWorkerIsolateStore();
  const slot = getStoreSlot(league);
  const existing = store[slot];
  if (existing?.meta.totalGames) return true;

  const conferenceMap = conferenceMapFromRegistry(league);
  if (!isHydratableConferenceMap(conferenceMap)) {
    conferenceMap.clear();
    return false;
  }

  let gameFile: RuntimeGameLogFile | null = null;
  try {
    gameFile = await fetchGameLogFile(origin, league);
    if (!isHydratableGameLogFile(gameFile)) {
      conferenceMap.clear();
      return false;
    }

    const components = buildComponents(league, conferenceMap, gameFile);
    setNcaaSportComponents(league, components);

    const dataLeague = ROUTE_TO_DATA_LEAGUE[league];
    if (!getCachedGameLogs(dataLeague)) {
      setCachedGameLogs(dataLeague, gameFile);
    }

    const cachedStats = getCachedRefStats(league);
    if (cachedStats?.refs?.length) {
      setCachedRefStats(
        league,
        applyNcaaPipelineVerificationMeta(league, cachedStats, gameFile.games),
      );
    }

    return true;
  } catch (error) {
    console.error("[refwatch] NCAA component hydration failed", league, error);
    clearNcaaSportComponents(store[slot]);
    store[slot] = null;
    conferenceMap.clear();
    return false;
  } finally {
    releaseParsedPayload(gameFile);
    releaseParsedPayload(conferenceMap);
  }
}

export function pathNeedsNcaaComponents(pathname: string): NcaaRouteLeague | null {
  const path = normalizeAppPathname(pathname);
  if (path === "/cbb" || path.startsWith("/cbb/")) return "cbb";
  if (path === "/cfb" || path.startsWith("/cfb/")) return "cfb";
  return null;
}

/** NCAA integrity audit hydrates both college pipelines on one page. */
export function ncaaLeaguesForPath(pathname: string): NcaaRouteLeague[] {
  const league = pathNeedsNcaaComponents(pathname);
  return league ? [league] : [];
}

export async function preloadNcaaComponentsForPath(
  origin: string,
  pathname: string,
): Promise<void> {
  const leagues = ncaaLeaguesForPath(pathname);
  for (const league of leagues) {
    await preloadNcaaSportComponents(origin, league);
  }
}
