import "@/lib/global-stats";
import type {
  CbbStatsGlobalKey,
  CfbStatsGlobalKey,
  EplStatsGlobalKey,
  NbaStatsGlobalKey,
  NflStatsGlobalKey,
  NhlStatsGlobalKey,
} from "@/lib/global-stats";
import {
  isVerifiedLiveLeague,
  resolveLeagueVerification,
} from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";

type League = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";
type CacheKey =
  | NbaStatsGlobalKey
  | NhlStatsGlobalKey
  | NflStatsGlobalKey
  | CbbStatsGlobalKey
  | CfbStatsGlobalKey
  | EplStatsGlobalKey;

const CACHE_KEYS: Record<League, CacheKey> = {
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
  nfl: "__REFWATCH_NFL_REF_STATS__",
  epl: "__REFWATCH_EPL_REF_STATS__",
  cbb: "__REFWATCH_CBB_REF_STATS__",
  cfb: "__REFWATCH_CFB_REF_STATS__",
};

const ASSET_BASE: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
};

export function getCachedRefStats(league: League): RefStatsFile | null {
  return globalThis[CACHE_KEYS[league]] ?? null;
}

/** Prefer verified CDN-hydrated cache over stale Worker bundle files on disk. */
export function resolveRefStatsFromFsOrCache(
  league: League,
  fromFs: RefStatsFile | null,
): RefStatsFile | null {
  const cached = getCachedRefStats(league);
  const leagueId = league as LeagueId;
  const cachedVerified = Boolean(
    cached?.refs?.length &&
      resolveLeagueVerification(leagueId, cached.meta).data_verified,
  );
  const fsVerified = Boolean(
    fromFs?.refs?.length &&
      resolveLeagueVerification(leagueId, fromFs.meta).data_verified,
  );

  if (cachedVerified) return cached;
  if (fsVerified) return fromFs;

  // Never serve stale seeded bundle data for verified live leagues on Workers.
  if (isVerifiedLiveLeague(leagueId)) {
    return null;
  }

  const fsRefs = fromFs?.refs?.length ?? 0;
  const cachedRefs = cached?.refs?.length ?? 0;
  if (cached && cachedRefs >= fsRefs) return cached;
  if (fsRefs > 0) return fromFs;
  return cached ?? fromFs;
}

export function setCachedRefStats(league: League, data: RefStatsFile): void {
  globalThis[CACHE_KEYS[league]] = data;
}

export async function preloadRefStatsFromAssets(
  origin: string,
  league: League,
): Promise<void> {
  if (getCachedRefStats(league)) return;

  const assetPath = `${ASSET_BASE[league]}/ref-stats.json`;
  const res = await fetch(`${origin}${assetPath}`);
  if (!res.ok) return;
  const data = (await res.json()) as RefStatsFile;
  if (data.refs?.length) {
    setCachedRefStats(league, data);
  }
}

export async function preloadLeagueDataForPath(
  origin: string,
  pathname: string,
): Promise<void> {
  const { preloadLeagueDataForPath: preloadOnEdge } = await import(
    "@/lib/edge-preload"
  );
  await preloadOnEdge(origin, pathname);
}

/** Load only the leagues a route needs, avoids parsing both 8MB files on every request. */
export function leaguesForPath(pathname: string): League[] {
  if (pathname.startsWith("/epl")) return ["epl"];
  if (pathname.startsWith("/cfb")) return ["cfb"];
  if (pathname.startsWith("/cbb")) return ["cbb"];
  if (pathname.startsWith("/nfl")) return ["nfl"];
  if (pathname.startsWith("/nhl")) return ["nhl"];
  if (
    pathname.startsWith("/research") ||
    pathname.startsWith("/methodology") ||
    pathname.startsWith("/sitemap")
  ) {
    return ["nba"];
  }
  if (pathname.startsWith("/feed/nhl")) return ["nhl"];
  if (pathname.startsWith("/feed")) return ["nba"];
  return ["nba"];
}
