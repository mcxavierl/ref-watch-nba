import type { RefStatsFile } from "@/lib/types";
import type { DataLeague, RuntimeGameLogFile } from "@/lib/game-logs-preload";

type League = "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";

const REF_STATS_KEYS: Record<League, keyof typeof globalThis> = {
  nba: "__REFWATCH_NBA_REF_STATS__",
  nhl: "__REFWATCH_NHL_REF_STATS__",
  nfl: "__REFWATCH_NFL_REF_STATS__",
  epl: "__REFWATCH_EPL_REF_STATS__",
  cbb: "__REFWATCH_CBB_REF_STATS__",
  cfb: "__REFWATCH_CFB_REF_STATS__",
};

const GAME_LOG_KEYS: Record<DataLeague, keyof typeof globalThis> = {
  NBA: "__REFWATCH_NBA_GAME_LOGS__",
  NHL: "__REFWATCH_NHL_GAME_LOGS__",
  NFL: "__REFWATCH_NFL_GAME_LOGS__",
  EPL: "__REFWATCH_EPL_GAME_LOGS__",
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
};

const REF_STATS_ASSET: Record<League, string> = {
  nba: "/data/nba",
  nhl: "/data/nhl",
  nfl: "/data/nfl",
  epl: "/data/epl",
  cbb: "/data/cbb",
  cfb: "/data/cfb",
};

const GAME_LOG_ASSET: Record<DataLeague, string> = {
  NBA: "/data/nba",
  NHL: "/data/nhl",
  NFL: "/data/nfl",
  EPL: "/data/epl",
  CBB: "/data/cbb",
  CFB: "/data/cfb",
};

const DATA_LEAGUE_FOR_ROUTE: Record<League, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  cbb: "CBB",
  cfb: "CFB",
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

async function preloadGameLogs(origin: string, league: DataLeague): Promise<void> {
  if (globalThis[GAME_LOG_KEYS[league]]) return;

  const res = await fetch(`${origin}${GAME_LOG_ASSET[league]}/game-logs.json`);
  if (!res.ok) return;
  const data = (await res.json()) as RuntimeGameLogFile;
  if (data.games?.length) {
    (globalThis as Record<string, unknown>)[GAME_LOG_KEYS[league]] = data;
  }
}

/** Edge middleware entry: fetch static assets into globalThis caches only. */
export async function preloadLeagueDataForPath(
  origin: string,
  pathname: string,
): Promise<void> {
  const leagues = leaguesForPath(pathname);
  await Promise.all(
    leagues.flatMap((league) => [
      preloadRefStats(origin, league),
      preloadGameLogs(origin, DATA_LEAGUE_FOR_ROUTE[league]),
    ]),
  );
}
