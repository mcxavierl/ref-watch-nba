import "@/lib/global-stats";
import type {
  CbbStatsGlobalKey,
  CfbStatsGlobalKey,
  EplStatsGlobalKey,
  LaligaStatsGlobalKey,
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

type League = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
type CacheKey =
  | NbaStatsGlobalKey
  | NhlStatsGlobalKey
  | NflStatsGlobalKey
  | CbbStatsGlobalKey
  | CfbStatsGlobalKey
  | EplStatsGlobalKey
  | LaligaStatsGlobalKey;

const CACHE_KEYS: Record<League, CacheKey> = {
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
  nfl: "__REFWATCH_NFL_REF_STATS__",
  epl: "__REFWATCH_EPL_REF_STATS__",
  laliga: "__REFWATCH_LALIGA_REF_STATS__",
  cbb: "__REFWATCH_CBB_REF_STATS__",
  cfb: "__REFWATCH_CFB_REF_STATS__",
};

type TeamSplitsCacheKey =
  | "__REFWATCH_NBA_TEAM_SPLITS__"
  | "__REFWATCH_NHL_TEAM_SPLITS__"
  | "__REFWATCH_NFL_TEAM_SPLITS__"
  | "__REFWATCH_EPL_TEAM_SPLITS__"
  | "__REFWATCH_LALIGA_TEAM_SPLITS__"
  | "__REFWATCH_CBB_TEAM_SPLITS__";

const TEAM_SPLITS_CACHE_KEYS: Partial<Record<League, TeamSplitsCacheKey>> = {
  nba: "__REFWATCH_NBA_TEAM_SPLITS__",
  nhl: "__REFWATCH_NHL_TEAM_SPLITS__",
  nfl: "__REFWATCH_NFL_TEAM_SPLITS__",
  epl: "__REFWATCH_EPL_TEAM_SPLITS__",
  laliga: "__REFWATCH_LALIGA_TEAM_SPLITS__",
  cbb: "__REFWATCH_CBB_TEAM_SPLITS__",
};

const ASSET_BASE: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  laliga: "/data/laliga",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
};

export function getCachedRefStats(league: League): RefStatsFile | null {
  return globalThis[CACHE_KEYS[league]] ?? null;
}

/** SSR-hydrated stats from ASSETS — skip Node fs re-parses on Workers. */
export function getPreferHydratedRefStats(league: League): RefStatsFile | null {
  const cached = getCachedRefStats(league);
  if (!cached?.refs?.length) return null;
  const leagueId = league as LeagueId;
  if (
    isVerifiedLiveLeague(leagueId) &&
    !resolveLeagueVerification(leagueId, cached.meta).data_verified
  ) {
    return null;
  }
  return cached;
}

export function cachedTeamSplitsForLeague(
  league: League,
): Record<string, TeamCrewSplit[]> {
  return getCachedTeamSplits(league) ?? {};
}

/** Prefer hydrated cache; only touch disk when the isolate has no CDN data yet. */
export function loadRefStatsRawCachedFirst(
  league: League,
  loadFromFs: () => RefStatsFile | null,
): RefStatsFile | null {
  const hydrated = getPreferHydratedRefStats(league);
  if (hydrated) return hydrated;
  return resolveRefStatsFromFsOrCache(league, loadFromFs());
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

  if (cachedVerified && cached) {
    return attachTeamSplits(league, cached, getCachedTeamSplits(league) ?? {});
  }
  if (fsVerified && fromFs) {
    return attachTeamSplits(league, fromFs, getCachedTeamSplits(league) ?? {});
  }

  // Never serve stale seeded bundle data for verified live leagues on Workers.
  if (isVerifiedLiveLeague(leagueId)) {
    return null;
  }

  const fsRefs = fromFs?.refs?.length ?? 0;
  const cachedRefs = cached?.refs?.length ?? 0;
  const splits = getCachedTeamSplits(league) ?? {};
  if (cached && cachedRefs >= fsRefs) {
    return attachTeamSplits(league, cached, splits);
  }
  if (fsRefs > 0 && fromFs) return attachTeamSplits(league, fromFs, splits);
  const fallback = cached ?? fromFs;
  return fallback ? attachTeamSplits(league, fallback, splits) : null;
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

/** NBA /matrix rebuilds scoped stats from game logs; other league matrix routes do not. */
export function pathNeedsGameLogs(pathname: string): boolean {
  return false;
}

/** Matrix, findings, and team crew pages need sidecar team-splits; slate hubs do not. */
export function pathNeedsTeamSplits(pathname: string): boolean {
  if (pathname.startsWith("/overview")) return false;
  if (pathname.startsWith("/methodology")) return false;
  if (pathname.startsWith("/research")) return false;
  if (pathname.startsWith("/sitemap")) return false;
  if (pathname.startsWith("/feed")) return false;
  if (/\/refs(\/|$)/.test(pathname)) return false;
  // League slates only need slim ref-stats (~0.5–1.5MB); team-splits are 2–9MB each.
  if (pathname === "/") return false;
  if (/^\/(nhl|nfl|epl|laliga|cbb|cfb)\/?$/.test(pathname)) return false;
  return true;
}

/** Load only the leagues a route needs, avoids parsing both 8MB files on every request. */
export function leaguesForPath(pathname: string): League[] {
  if (pathname.startsWith("/overview")) {
    return [];
  }
  if (pathname.startsWith("/epl")) return ["epl"];
  if (pathname.startsWith("/laliga")) return ["laliga"];
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
