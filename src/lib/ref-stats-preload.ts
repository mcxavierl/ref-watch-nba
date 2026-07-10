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
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";

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

type TeamSplitsCacheKey =
  | "__REFWATCH_NBA_TEAM_SPLITS__"
  | "__REFWATCH_NHL_TEAM_SPLITS__"
  | "__REFWATCH_NFL_TEAM_SPLITS__"
  | "__REFWATCH_EPL_TEAM_SPLITS__";

const TEAM_SPLITS_CACHE_KEYS: Partial<Record<League, TeamSplitsCacheKey>> = {
  nba: "__REFWATCH_NBA_TEAM_SPLITS__",
  nhl: "__REFWATCH_NHL_TEAM_SPLITS__",
  nfl: "__REFWATCH_NFL_TEAM_SPLITS__",
  epl: "__REFWATCH_EPL_TEAM_SPLITS__",
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

  if (cachedVerified && cached) return attachTeamSplits(league, cached, {});
  if (fsVerified && fromFs) return attachTeamSplits(league, fromFs, {});

  // Never serve stale seeded bundle data for verified live leagues on Workers.
  if (isVerifiedLiveLeague(leagueId)) {
    return null;
  }

  const fsRefs = fromFs?.refs?.length ?? 0;
  const cachedRefs = cached?.refs?.length ?? 0;
  if (cached && cachedRefs >= fsRefs) {
    return attachTeamSplits(league, cached, {});
  }
  if (fsRefs > 0 && fromFs) return attachTeamSplits(league, fromFs, {});
  const fallback = cached ?? fromFs;
  return fallback ? attachTeamSplits(league, fallback, {}) : null;
}

export function getCachedTeamSplits(
  league: League,
): Record<string, TeamCrewSplit[]> | null {
  const key = TEAM_SPLITS_CACHE_KEYS[league];
  if (!key) return null;
  return globalThis[key] ?? null;
}

function writeCachedRefStats(league: League, data: RefStatsFile): void {
  globalThis[CACHE_KEYS[league]] = data;
}

/** Merge sidecar team splits into the slim ref-stats object already in cache. */
export function mergeCachedLeagueRefStats(league: League): void {
  const stats = getCachedRefStats(league);
  const splits = getCachedTeamSplits(league);
  if (!stats?.refs?.length || !splits || Object.keys(splits).length === 0) {
    return;
  }
  writeCachedRefStats(league, { ...stats, teamSplits: splits });
}

export function setCachedRefStats(league: League, data: RefStatsFile): void {
  writeCachedRefStats(league, data);
  mergeCachedLeagueRefStats(league);
}

export function setCachedTeamSplits(
  league: League,
  splits: Record<string, TeamCrewSplit[]>,
): void {
  const key = TEAM_SPLITS_CACHE_KEYS[league];
  if (!key) return;
  globalThis[key] = splits;
  mergeCachedLeagueRefStats(league);
}

/** Slim ref-stats core strips teamSplits; merge CDN/file splits for matrix baselines. */
export function resolveTeamSplitsForLeague(
  league: League,
  embedded: Record<string, TeamCrewSplit[]>,
  fromFile: Record<string, TeamCrewSplit[]>,
): Record<string, TeamCrewSplit[]> {
  const cached = getCachedTeamSplits(league);
  if (cached && Object.keys(cached).length > 0) return cached;
  if (Object.keys(fromFile).length > 0) return fromFile;
  return embedded;
}

export function attachTeamSplits(
  league: League,
  stats: RefStatsFile,
  fromFile: Record<string, TeamCrewSplit[]>,
): RefStatsFile {
  const teamSplits = resolveTeamSplitsForLeague(
    league,
    stats.teamSplits ?? {},
    fromFile,
  );
  return { ...stats, teamSplits };
}

export async function preloadRefStatsFromAssets(
  origin: string,
  league: League,
): Promise<void> {
  if (!getCachedRefStats(league)) {
    const assetPath = `${ASSET_BASE[league]}/ref-stats.json`;
    const res = await fetch(`${origin}${assetPath}`);
    if (res.ok) {
      const data = (await res.json()) as RefStatsFile;
      if (data.refs?.length) {
        setCachedRefStats(league, data);
      }
    }
  }

  const cachedSplits = getCachedTeamSplits(league);
  if (!cachedSplits || Object.keys(cachedSplits).length === 0) {
    const splitsPath = `${ASSET_BASE[league]}/team-splits.json`;
    const res = await fetch(`${origin}${splitsPath}`);
    if (res.ok) {
      const splits = (await res.json()) as Record<string, TeamCrewSplit[]>;
      if (Object.keys(splits).length > 0) {
        setCachedTeamSplits(league, splits);
      }
    }
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
