import "@/lib/global-stats";
import type { NbaStatsGlobalKey, NhlStatsGlobalKey } from "@/lib/global-stats";
import type { RefStatsFile } from "@/lib/types";

type League = "nba" | "nhl";
type CacheKey = NbaStatsGlobalKey | NhlStatsGlobalKey;

const CACHE_KEYS: Record<League, CacheKey> = {
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
};

const ASSET_BASE: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
};

export function getCachedRefStats(league: League): RefStatsFile | null {
  return globalThis[CACHE_KEYS[league]] ?? null;
}

export function setCachedRefStats(league: League, data: RefStatsFile): void {
  globalThis[CACHE_KEYS[league]] = data;
}

export async function preloadRefStatsFromAssets(
  origin: string,
  league: League,
): Promise<void> {
  if (getCachedRefStats(league)) return;

  for (const file of ["ref-stats.json", "ref-stats.seed.json"]) {
    const res = await fetch(`${origin}${ASSET_BASE[league]}/${file}`);
    if (!res.ok) continue;
    const data = (await res.json()) as RefStatsFile;
    if (data.refs?.length) {
      setCachedRefStats(league, data);
      return;
    }
  }
}

/** Load only the leagues a route needs, avoids parsing both 8MB files on every request. */
export function leaguesForPath(pathname: string): League[] {
  if (pathname.startsWith("/nhl")) return ["nhl"];
  if (
    pathname.startsWith("/research") ||
    pathname.startsWith("/methodology") ||
    pathname.startsWith("/sitemap")
  ) {
    return ["nba", "nhl"];
  }
  if (pathname.startsWith("/feed/nhl")) return ["nhl"];
  if (pathname.startsWith("/feed")) return ["nba"];
  return ["nba"];
}
