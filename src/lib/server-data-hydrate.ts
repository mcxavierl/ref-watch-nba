import { cache } from "react";
import { preloadLeagueDataForPath } from "@/lib/edge-preload";
import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
import {
  leaguesForPath,
  pathNeedsGameLogs,
} from "@/lib/ref-stats-preload";
import { SITE_URL } from "@/lib/site";

const DATA_LEAGUE_FOR_ROUTE: Record<
  ReturnType<typeof leaguesForPath>[number],
  DataLeague
> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

/** SSR isolate: fetch /public data assets when Workers cannot read data/ from disk. */
export const hydrateLeagueDataForPath = cache(async (pathname: string) => {
  const path = normalizeAppPathname(pathname);
  if (path.startsWith("/overview")) return;
  if (path === "/") return;

  try {
    await preloadLeagueDataForPath(SITE_URL, path);
  } catch (error) {
    console.error("[refwatch] league data hydration failed", path, error);
  }

  if (!pathNeedsGameLogs(path)) return;

  const leagues = leaguesForPath(path);
  for (const league of leagues) {
    try {
      await preloadGameLogsFromAssets(SITE_URL, DATA_LEAGUE_FOR_ROUTE[league]);
    } catch (error) {
      console.error("[refwatch] game-log hydration failed", league, error);
    }
  }
});
