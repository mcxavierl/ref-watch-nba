import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import { resolveLeagueVerification } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import {
  getCachedRefStats,
  getCachedTeamSplits,
  setCachedRefStats,
  setCachedTeamSplits,
} from "@/lib/ref-stats-preload";

type League = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

const REF_STATS_ASSET: Record<League, string> = {
  nba: "/data/nba/ref-stats.json",
  nhl: "/data/nhl/ref-stats.json",
  nfl: "/data/nfl/ref-stats.json",
  epl: "/data/epl/ref-stats.json",
  cbb: "/data/cbb/ref-stats.json",
  cfb: "/data/cfb/ref-stats.json",
};

function leaguesForPath(pathname: string): League[] {
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
  cbb: "/data/cbb",
  cfb: "/data/cfb",
};

async function preloadTeamSplits(league: League, origin: string): Promise<void> {
  const cached = getCachedTeamSplits(league);
  if (cached && Object.keys(cached).length > 0) return;

  const assetPath = `${ASSET_BASE[league]}/team-splits.json`;
  const data =
    (await fetchJsonAsset<Record<string, TeamCrewSplit[]>>(assetPath)) ??
    (await fetchOriginJson<Record<string, TeamCrewSplit[]>>(origin, assetPath));

  if (data && Object.keys(data).length > 0) {
    setCachedTeamSplits(league, data);
  }
}

async function preloadRefStats(origin: string, league: League): Promise<void> {
  const cached = getCachedRefStats(league);
  if (
    cached?.refs?.length &&
    resolveLeagueVerification(league as LeagueId, cached.meta).data_verified
  ) {
    await preloadTeamSplits(league, origin);
    return;
  }

  const assetPath = REF_STATS_ASSET[league];
  const data =
    (await fetchRefStatsAsset(assetPath)) ??
    (await fetchRefStatsOrigin(origin, assetPath));

  if (data?.refs?.length) {
    setCachedRefStats(league, data);
  }
  await preloadTeamSplits(league, origin);
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
): Promise<void> {
  try {
    await preloadRefStats(origin, league);
  } catch {
    // Never fail the request from preload.
  }
}

/** SSR hydration: slim ref-stats via ASSETS (Workers-safe, ~500KB parse). */
export async function preloadLeagueDataForPath(
  origin: string,
  pathname: string,
): Promise<void> {
  const leagues = leaguesForPath(pathname);
  try {
    await Promise.all(leagues.map((league) => preloadRefStats(origin, league)));
  } catch {
    // Never fail the request from preload.
  }
}
