import type { RefStatsFile } from "@/lib/types";
import { getCachedRefStats, setCachedRefStats } from "@/lib/ref-stats-preload";

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

async function fetchRefStatsAsset(assetPath: string): Promise<RefStatsFile | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const assets = getCloudflareContext().env.ASSETS;
    if (assets) {
      const res = await assets.fetch(new URL(assetPath, "https://assets.local"));
      if (res.ok) {
        return (await res.json()) as RefStatsFile;
      }
    }
  } catch {
    // Not on Cloudflare Workers.
  }
  return null;
}

async function fetchRefStatsOrigin(
  origin: string,
  assetPath: string,
): Promise<RefStatsFile | null> {
  const res = await fetch(`${origin}${assetPath}`);
  if (!res.ok) return null;
  return (await res.json()) as RefStatsFile;
}

async function preloadRefStats(origin: string, league: League): Promise<void> {
  if (getCachedRefStats(league)) return;

  const assetPath = REF_STATS_ASSET[league];
  const data =
    (await fetchRefStatsAsset(assetPath)) ??
    (await fetchRefStatsOrigin(origin, assetPath));

  if (data?.refs?.length) {
    setCachedRefStats(league, data);
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
