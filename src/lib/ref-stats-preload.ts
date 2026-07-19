import { safeOriginFetch } from "@/lib/edge-fetch";
import "@/lib/global-stats";
import {
  freezeWorkerConfig,
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";
import {
  isVerifiedLiveLeague,
  resolveLeagueVerification,
} from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import { enrichRefStatsWithGeography } from "@/lib/ref-geography";

type League = "nba" | "nhl" | "wnba" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

function hasGameLogOnlyIngest(stats: RefStatsFile | null | undefined): boolean {
  if (!stats) return false;
  return (
    (stats.meta.totalGamesProcessed ?? 0) > 0 &&
    stats.meta.source === "espn"
  );
}

const REF_STATS_CACHE_KEYS = freezeWorkerConfig({
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
  nfl: "__REFWATCH_NFL_REF_STATS__",
  epl: "__REFWATCH_EPL_REF_STATS__",
  laliga: "__REFWATCH_LALIGA_REF_STATS__",
  cbb: "__REFWATCH_CBB_REF_STATS__",
  cfb: "__REFWATCH_CFB_REF_STATS__",
  wnba: "__REFWATCH_WNBA_REF_STATS__",
} as const);

const TEAM_SPLITS_CACHE_KEYS = freezeWorkerConfig({
  nba: "__REFWATCH_NBA_TEAM_SPLITS__",
  nhl: "__REFWATCH_NHL_TEAM_SPLITS__",
  nfl: "__REFWATCH_NFL_TEAM_SPLITS__",
  epl: "__REFWATCH_EPL_TEAM_SPLITS__",
  laliga: "__REFWATCH_LALIGA_TEAM_SPLITS__",
  cbb: "__REFWATCH_CBB_TEAM_SPLITS__",
  wnba: "__REFWATCH_WNBA_TEAM_SPLITS__",
} as const);

const ASSET_BASE = freezeWorkerConfig({
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  laliga: "/data/laliga",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
  wnba: "/data/wnba",
} as const);

function readGlobalRefStats(league: League): RefStatsFile | null {
  const key = REF_STATS_CACHE_KEYS[league];
  return (globalThis as unknown as Record<string, RefStatsFile | undefined>)[key] ?? null;
}

function writeGlobalRefStats(league: League, data: RefStatsFile): void {
  const key = REF_STATS_CACHE_KEYS[league];
  (globalThis as unknown as Record<string, RefStatsFile | undefined>)[key] = data;
}

export function getCachedRefStats(league: League): RefStatsFile | null {
  return getWorkerIsolateStore().refStats[league] ?? readGlobalRefStats(league);
}

/** SSR-hydrated stats from ASSETS — skip Node fs re-parses on Workers. */
export function getPreferHydratedRefStats(league: League): RefStatsFile | null {
  const cached = getCachedRefStats(league);
  if (!cached?.refs?.length) return null;
  if (hasGameLogOnlyIngest(cached)) {
    return cached;
  }
  const leagueId = league as LeagueId;
  if (
    isVerifiedLiveLeague(leagueId) &&
    !resolveLeagueVerification(leagueId, cached.meta, cached).data_verified
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
      resolveLeagueVerification(leagueId, cached.meta, cached).data_verified,
  );
  const fsVerified = Boolean(
    fromFs?.refs?.length &&
      resolveLeagueVerification(leagueId, fromFs.meta, fromFs).data_verified,
  );

  if (cachedVerified && cached) {
    return withGeography(
      league,
      attachTeamSplits(league, cached, getCachedTeamSplits(league) ?? {}),
    );
  }
  if (fsVerified && fromFs) {
    return withGeography(
      league,
      attachTeamSplits(league, fromFs, getCachedTeamSplits(league) ?? {}),
    );
  }

  if (fromFs && hasGameLogOnlyIngest(fromFs)) {
    return withGeography(
      league,
      attachTeamSplits(league, fromFs, getCachedTeamSplits(league) ?? {}),
    );
  }
  if (cached && hasGameLogOnlyIngest(cached)) {
    return withGeography(
      league,
      attachTeamSplits(league, cached, getCachedTeamSplits(league) ?? {}),
    );
  }

  // Never serve stale seeded bundle data for verified live leagues on Workers.
  if (isVerifiedLiveLeague(leagueId)) {
    return null;
  }

  const fsRefs = fromFs?.refs?.length ?? 0;
  const cachedRefs = cached?.refs?.length ?? 0;
  const splits = getCachedTeamSplits(league) ?? {};
  if (cached && cachedRefs >= fsRefs) {
    return withGeography(league, attachTeamSplits(league, cached, splits));
  }
  if (fsRefs > 0 && fromFs) {
    return withGeography(league, attachTeamSplits(league, fromFs, splits));
  }
  const fallback = cached ?? fromFs;
  return fallback
    ? withGeography(league, attachTeamSplits(league, fallback, splits))
    : null;
}

function readGlobalTeamSplits(
  league: League,
): Record<string, TeamCrewSplit[]> | null {
  const key = TEAM_SPLITS_CACHE_KEYS[league as keyof typeof TEAM_SPLITS_CACHE_KEYS];
  if (!key) return null;
  return (globalThis as unknown as Record<string, Record<string, TeamCrewSplit[]> | undefined>)[key] ?? null;
}

export function getCachedTeamSplits(
  league: League,
): Record<string, TeamCrewSplit[]> | null {
  return getWorkerIsolateStore().teamSplits[league] ?? readGlobalTeamSplits(league);
}

function withGeography(league: League, stats: RefStatsFile): RefStatsFile {
  return enrichRefStatsWithGeography(league as LeagueId, stats);
}

function writeCachedRefStats(league: League, data: RefStatsFile): void {
  const enriched = withGeography(league, data);
  getWorkerIsolateStore().refStats[league] = enriched;
  writeGlobalRefStats(league, enriched);
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
  if (!TEAM_SPLITS_CACHE_KEYS[league as keyof typeof TEAM_SPLITS_CACHE_KEYS]) {
    return;
  }
  getWorkerIsolateStore().teamSplits[league] = splits;
  const key = TEAM_SPLITS_CACHE_KEYS[league as keyof typeof TEAM_SPLITS_CACHE_KEYS];
  if (key) {
    (globalThis as unknown as Record<string, Record<string, TeamCrewSplit[]> | undefined>)[key] =
      splits;
  }
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
      const res = await safeOriginFetch(origin, assetPath);
      if (res?.ok) {
        const { isRefStatsPayload } = await import("@/lib/json-asset-guards");
        let data: unknown = await res.json();
        if (
          isRefStatsPayload(data) &&
          (data.refs.length > 0 || (data.meta.totalGamesProcessed ?? 0) > 0)
        ) {
          setCachedRefStats(league, data as RefStatsFile);
        }
        data = releaseParsedPayload(data);
      }
    }

    if (!includeTeamSplits) return;

    const cachedSplits = getCachedTeamSplits(league);
    if (!cachedSplits || Object.keys(cachedSplits).length === 0) {
      const splitsPath = `${ASSET_BASE[league]}/team-splits.json`;
      const res = await safeOriginFetch(origin, splitsPath);
      if (res?.ok) {
        const { isTeamSplitsPayload } = await import("@/lib/json-asset-guards");
        let splits: unknown = await res.json();
        if (isTeamSplitsPayload(splits) && Object.keys(splits).length > 0) {
          setCachedTeamSplits(league, splits as Record<string, TeamCrewSplit[]>);
        }
        splits = releaseParsedPayload(splits);
      }
    }
  } catch (error) {
    console.error("[refwatch] preloadRefStatsFromAssets failed", league, error);
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
  if (isOverviewOnlyPath(path)) return false;
  if (path.startsWith("/methodology")) return false;
  if (path.startsWith("/sitemap")) return false;
  if (path.startsWith("/feed")) return false;
  if (path.startsWith("/compare")) return false;
  // Hub routes hydrate game logs in InsightsHubRoute / matrix page handlers.
  if (HUB_ROUTE.test(path)) return false;
  if (/\/refs(\/|$)/.test(path)) return true;
  if (/\/teams(\/|$)/.test(path)) return true;
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
  if (/^\/(nhl|nfl|epl|laliga|cbb|cfb|wnba)\/?$/.test(path)) return false;
  return true;
}

/** Load only the leagues a route needs, avoids parsing both 8MB files on every request. */
export function leaguesForPath(pathname: string): League[] {
  const path = normalizeAppPathname(pathname);
  if (isOverviewOnlyPath(path)) {
    return [];
  }
  if (path.startsWith("/ncaa")) return ["cbb", "cfb"];
  if (path === "/nba" || path.startsWith("/nba/")) return ["nba"];
  if (path.startsWith("/epl")) return ["epl"];
  if (path.startsWith("/laliga")) return ["laliga"];
  if (path.startsWith("/cfb")) return ["cfb"];
  if (path.startsWith("/cbb")) return ["cbb"];
  if (path.startsWith("/nfl")) return ["nfl"];
  if (path.startsWith("/nhl")) return ["nhl"];
  if (path.startsWith("/wnba")) return ["wnba"];
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
