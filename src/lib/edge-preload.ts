import { safeOriginJson } from "@/lib/edge-fetch";
import {
  freezeWorkerConfig,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";
import {
  isRefStatsPayload,
  isTeamSplitsPayload,
  normalizeAppPathname,
} from "@/lib/json-asset-guards";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import { resolveLeagueVerification } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import {
  attachTeamSplits,
  getCachedRefStats,
  getCachedTeamSplits,
  leaguesForPath,
  pathNeedsTeamSplits,
  setCachedRefStats,
  setCachedTeamSplits,
} from "@/lib/ref-stats-preload";

type League = "nba" | "nhl" | "wnba" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type PreloadOptions = {
  /** Overview only needs ref-stats totals/search; skip ~20MB of team-splits. */
  includeTeamSplits?: boolean;
};

const REF_STATS_ASSET = freezeWorkerConfig({
  nba: "/data/nba/ref-stats.json",
  nhl: "/data/nhl/ref-stats.json",
  nfl: "/data/nfl/ref-stats.json",
  epl: "/data/epl/ref-stats.json",
  laliga: "/data/laliga/ref-stats.json",
  cbb: "/data/cbb/ref-stats.json",
  cfb: "/data/cfb/ref-stats.json",
  wnba: "/data/wnba/ref-stats.json",
} as const);

async function parseJsonResponse(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJsonAsset(assetPath: string): Promise<unknown | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const assets = env.ASSETS as
      | { fetch: (input: RequestInfo) => Promise<Response> }
      | undefined;
    if (assets) {
      try {
        const res = await assets.fetch(`https://assets.local${assetPath}`);
        if (res.ok) {
          return parseJsonResponse(res);
        }
      } catch (error) {
        console.error("[refwatch] ASSETS fetch failed", assetPath, error);
      }
    }
    // Do not fall back to WORKER_SELF_REFERENCE for static JSON — it re-enters
    // the full Next handler, doubles CPU/memory, and can recurse on cold isolates.
  } catch {
    // Not on Cloudflare Workers.
  }
  return null;
}

async function fetchRefStatsAsset(assetPath: string): Promise<RefStatsFile | null> {
  let data: unknown = await fetchJsonAsset(assetPath);
  const stats =
    isRefStatsPayload(data) && data.refs.length > 0 ? (data as RefStatsFile) : null;
  data = releaseParsedPayload(data);
  return stats;
}

async function fetchRefStatsOrigin(
  origin: string,
  assetPath: string,
): Promise<RefStatsFile | null> {
  let data: unknown = await fetchOriginJson(origin, assetPath);
  const stats =
    isRefStatsPayload(data) && data.refs.length > 0 ? (data as RefStatsFile) : null;
  data = releaseParsedPayload(data);
  return stats;
}

async function fetchOriginJson(
  origin: string,
  assetPath: string,
): Promise<unknown | null> {
  return safeOriginJson(origin, assetPath);
}

async function fetchTeamSplitsOrigin(
  origin: string,
  assetPath: string,
): Promise<Record<string, TeamCrewSplit[]> | null> {
  let data: unknown = await fetchOriginJson(origin, assetPath);
  const splits =
    isTeamSplitsPayload(data) && Object.keys(data).length > 0
      ? (data as Record<string, TeamCrewSplit[]>)
      : null;
  data = releaseParsedPayload(data);
  return splits;
}

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

async function preloadRefStats(
  origin: string,
  league: League,
  options: PreloadOptions = {},
): Promise<void> {
  const includeTeamSplits = options.includeTeamSplits ?? true;
  const cached = getCachedRefStats(league);
  const needsStats =
    !cached?.refs?.length ||
    (cached
      ? !resolveLeagueVerification(league as LeagueId, cached.meta).data_verified
      : true);
  const needsSplits =
    includeTeamSplits &&
    (!getCachedTeamSplits(league) ||
      Object.keys(getCachedTeamSplits(league)!).length === 0);

  let stats: RefStatsFile | null = cached;
  let splits: Record<string, TeamCrewSplit[]> | null = getCachedTeamSplits(league);

  try {
    if (needsStats) {
      const assetPath = REF_STATS_ASSET[league];
      stats =
        (await fetchRefStatsAsset(assetPath)) ??
        (await fetchRefStatsOrigin(origin, assetPath));
    }

    if (needsSplits) {
      const assetPath = `${ASSET_BASE[league]}/team-splits.json`;
      let fromAssets: unknown = await fetchJsonAsset(assetPath);
      if (isTeamSplitsPayload(fromAssets) && Object.keys(fromAssets).length > 0) {
        splits = fromAssets;
      } else {
        splits = await fetchTeamSplitsOrigin(origin, assetPath);
      }
      fromAssets = releaseParsedPayload(fromAssets);
    }

    if (stats?.refs?.length) {
      const merged =
        splits && Object.keys(splits).length > 0
          ? attachTeamSplits(league, stats, splits)
          : stats;
      setCachedRefStats(league, merged);
      if (splits && Object.keys(splits).length > 0) {
        setCachedTeamSplits(league, splits);
      }
    } else if (splits && Object.keys(splits).length > 0) {
      setCachedTeamSplits(league, splits);
    }
  } finally {
    stats = releaseParsedPayload(stats);
    splits = releaseParsedPayload(splits);
  }
}

/**
 * Hydrate a single league's ref-stats into the global cache and await it.
 *
 * Server components that gate on verification (e.g. per-league layouts) must
 * call this and `await` it before reading `getRefStats()`. The root layout's
 * path-based preload runs concurrently with child segments in the App Router,
 * so relying on it alone leaves the cache empty on cold isolates.
 */
export async function preloadLeagueRefStats(
  origin: string,
  league: League,
  options: PreloadOptions = {},
): Promise<void> {
  try {
    await preloadRefStats(origin, league, options);
  } catch {
    // Never fail the request from preload.
  }
}

/** Path-scoped preload: skip multi-MB team-splits on slate hubs and ref indexes. */
export async function preloadLeagueRefStatsForPath(
  origin: string,
  league: League,
  pathname: string,
): Promise<void> {
  return preloadLeagueRefStats(origin, league, {
    includeTeamSplits: pathNeedsTeamSplits(normalizeAppPathname(pathname)),
  });
}

/** Overview hub: hydrate ref-stats only (no matrix / game-log payloads). */
export async function preloadOverviewLeagueRefStats(
  origin: string,
  league: League,
): Promise<void> {
  return preloadLeagueRefStats(origin, league, { includeTeamSplits: false });
}

/** SSR hydration: slim ref-stats via ASSETS (Workers-safe, ~500KB parse). */
export async function preloadLeagueDataForPath(
  origin: string,
  pathname: string,
): Promise<void> {
  if (!origin?.trim()) return;
  const path = normalizeAppPathname(pathname);
  let leagues = leaguesForPath(path);
  if (leagues.length === 0) return;
  const includeTeamSplits = pathNeedsTeamSplits(path);

  try {
    for (const league of leagues) {
      await preloadRefStats(origin, league, { includeTeamSplits });
    }
  } catch (error) {
    console.error("[refwatch] path preload failed", path, error);
  } finally {
    leagues = releaseParsedPayload(leagues)!;
  }
}
