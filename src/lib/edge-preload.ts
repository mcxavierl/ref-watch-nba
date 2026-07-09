import type { RefStatsFile } from "@/lib/types";

type League = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

const REF_STATS_KEYS: Record<League, keyof typeof globalThis> = {
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
  nfl: "__REFWATCH_NFL_REF_STATS__",
  epl: "__REFWATCH_EPL_REF_STATS__",
  cbb: "__REFWATCH_CBB_REF_STATS__",
  cfb: "__REFWATCH_CFB_REF_STATS__",
};

const REF_STATS_ASSET: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
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

async function preloadRefStats(origin: string, league: League): Promise<void> {
  if (globalThis[REF_STATS_KEYS[league]]) return;

  const res = await fetch(`${origin}${REF_STATS_ASSET[league]}/ref-stats.json`);
  if (!res.ok) return;
  const data = (await res.json()) as RefStatsFile;
  if (data.refs?.length) {
    (globalThis as Record<string, unknown>)[REF_STATS_KEYS[league]] = data;
  }
}

/** Optional edge preload: ref-stats only (skip multi-MB game logs). Prefer SSR hydrate. */
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
