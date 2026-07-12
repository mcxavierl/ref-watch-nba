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
import { normalizeAppPathname } from "@/lib/json-asset-guards";
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
  options: { includeTeamSplits?: boolean } = {},
): Promise<void> {
  const includeTeamSplits = options.includeTeamSplits ?? true;
  if (!origin?.trim()) return;

  try {
    if (!getCachedRefStats(league)) {
      const assetPath = `${ASSET_BASE[league]}/ref-stats.json`;
      const res = await fetch(`${origin}${assetPath}`);
      if (res.ok) {
        const { isRefStatsPayload } = await import("@/lib/json-asset-guards");
        const data: unknown = await res.json();
        if (isRefStatsPayload(data) && data.refs.length > 0) {
          setCachedRefStats(league, data);
        }
      }
    }

    if (!includeTeamSplits) return;

    const cachedSplits = getCachedTeamSplits(league);
    if (!cachedSplits || Object.keys(cachedSplits).length === 0) {
      const splitsPath = `${ASSET_BASE[league]}/team-splits.json`;
      const res = await fetch(`${origin}${splitsPath}`);
      if (res.ok) {
        const { isTeamSplitsPayload } = await import("@/lib/json-asset-guards");
        const splits: unknown = await res.json();
        if (isTeamSplitsPayload(splits) && Object.keys(splits).length > 0) {
          setCachedTeamSplits(league, splits);
        }
      }
    }
  } catch {
    // Never fail SSR from asset preload.
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

/** Routes that rebuild scoped stats from stored game logs (era / season toggles). */
export function pathNeedsGameLogs(pathname: string): boolean {
  const path = normalizeAppPathname(pathname);
  if (path === "/matrix" || path.startsWith("/teams/")) return true;
  if (path.startsWith("/nfl/matrix") || path.startsWith("/nfl/teams/")) return true;
  if (path.startsWith("/nfl/refs")) return true;
  if (path.startsWith("/nhl/teams/") || path.startsWith("/nhl/matrix")) return true;
  return false;
}

const HUB_ROUTE =
  /(^|\/)(insights|research|rankings|trends|crews)(\/|$)/;

function isOverviewOnlyPath(path: string): boolean {
  return path === "/" || path.startsWith("/overview");
}

/** Matrix and team pages need sidecar team-splits; slate and hub routes do not. */
export function pathNeedsTeamSplits(pathname: string): boolean {
  const path = normalizeAppPathname(pathname);
  if (isOverviewOnlyPath(path)) return false;
  if (path.startsWith("/methodology")) return false;
  if (path.startsWith("/research")) return false;
  if (path.startsWith("/sitemap")) return false;
  if (path.startsWith("/feed")) return false;
  if (/\/refs(\/|$)/.test(path)) return false;
  if (HUB_ROUTE.test(path)) return false;
  // League slates only need slim ref-stats (~0.5–1.5MB); team-splits are 2–9MB each.
  if (path === "/nba") return false;
  if (/^\/(nhl|nfl|epl|laliga|cbb|cfb)\/?$/.test(path)) return false;
  return true;
}

/** Load only the leagues a route needs, avoids parsing both 8MB files on every request. */
export function leaguesForPath(pathname: string): League[] {
  const path = normalizeAppPathname(pathname);
  if (isOverviewOnlyPath(path)) {
    return [];
  }
  if (path === "/nba" || path.startsWith("/nba/")) return ["nba"];
  if (path.startsWith("/epl")) return ["epl"];
  if (path.startsWith("/laliga")) return ["laliga"];
  if (path.startsWith("/cfb")) return ["cfb"];
  if (path.startsWith("/cbb")) return ["cbb"];
  if (path.startsWith("/nfl")) return ["nfl"];
  if (path.startsWith("/nhl")) return ["nhl"];
  if (
    path.startsWith("/research") ||
    path.startsWith("/methodology") ||
    path.startsWith("/sitemap")
  ) {
    return ["nba"];
  }
  if (path.startsWith("/feed/nhl")) return ["nhl"];
  if (path.startsWith("/feed")) return ["nba"];
  return ["nba"];
}
