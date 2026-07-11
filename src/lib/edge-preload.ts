import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import { resolveLeagueVerification } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import {
  attachTeamSplits,
  getCachedRefStats,
  getCachedTeamSplits,
  pathNeedsTeamSplits,
  setCachedRefStats,
  setCachedTeamSplits,
} from "@/lib/ref-stats-preload";

type League = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type PreloadOptions = {
  /** Overview only needs ref-stats totals/search; skip ~20MB of team-splits. */
  includeTeamSplits?: boolean;
};

const REF_STATS_ASSET: Record<League, string> = {
  nba: "/data/nba/ref-stats.json",
  nhl: "/data/nhl/ref-stats.json",
  nfl: "/data/nfl/ref-stats.json",
  epl: "/data/epl/ref-stats.json",
  laliga: "/data/laliga/ref-stats.json",
  cbb: "/data/cbb/ref-stats.json",
  cfb: "/data/cfb/ref-stats.json",
};

function leaguesForPath(pathname: string): League[] {
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

async function fetchJsonAsset<T>(assetPath: string): Promise<T | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const assets = env.ASSETS as
      | { fetch: (input: RequestInfo) => Promise<Response> }
      | undefined;
    if (assets) {
      const res = await assets.fetch(`https://assets.local${assetPath}`);
      if (res.ok) {
        return (await res.json()) as T;
      }
    }

    const worker = env.WORKER_SELF_REFERENCE as
      | { fetch: (input: RequestInfo) => Promise<Response> }
      | undefined;
    if (worker) {
      const res = await worker.fetch(`https://refwatch.internal${assetPath}`);
      if (res.ok) {
        return (await res.json()) as T;
      }
    }
  } catch {
    // Not on Cloudflare Workers.
  }
  return null;
}

async function fetchRefStatsAsset(assetPath: string): Promise<RefStatsFile | null> {
  return fetchJsonAsset<RefStatsFile>(assetPath);
}

async function fetchRefStatsOrigin(
  origin: string,
  assetPath: string,
): Promise<RefStatsFile | null> {
  return fetchOriginJson<RefStatsFile>(origin, assetPath);
}

async function fetchOriginJson<T>(
  origin: string,
  assetPath: string,
): Promise<T | null> {
  const res = await fetch(`${origin}${assetPath}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const ASSET_BASE: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  laliga: "/data/laliga",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
};

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

  const statsPromise = needsStats
    ? (async () => {
        const assetPath = REF_STATS_ASSET[league];
        return (
          (await fetchRefStatsAsset(assetPath)) ??
          (await fetchRefStatsOrigin(origin, assetPath))
        );
      })()
    : Promise.resolve(cached);

  const splitsPromise = needsSplits
    ? (async () => {
        const assetPath = `${ASSET_BASE[league]}/team-splits.json`;
        return (
          (await fetchJsonAsset<Record<string, TeamCrewSplit[]>>(assetPath)) ??
          (await fetchOriginJson<Record<string, TeamCrewSplit[]>>(
            origin,
            assetPath,
          ))
        );
      })()
    : Promise.resolve(getCachedTeamSplits(league));

  const [stats, splits] = await Promise.all([statsPromise, splitsPromise]);

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
  const leagues = leaguesForPath(pathname);
  if (leagues.length === 0) return;
  const includeTeamSplits = pathNeedsTeamSplits(pathname);

  try {
    await Promise.all(
      leagues.map((league) =>
        preloadRefStats(origin, league, { includeTeamSplits }),
      ),
    );
  } catch {
    // Never fail the request from preload.
  }
}
