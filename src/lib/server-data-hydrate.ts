import { cache } from "react";
import {
  preloadLeagueDataForPath,
  preloadOverviewLeagueRefStats,
} from "@/lib/edge-preload";
import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { preloadNcaaComponentsForPath } from "@/lib/ncaa-isolate-components";
import {
  leaguesForPath,
  pathNeedsGameLogs,
} from "@/lib/ref-stats-preload";
import { SITE_URL } from "@/lib/site";
import {
  beginWorkerIsolateRequest,
  freezeWorkerConfig,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

const DATA_LEAGUE_FOR_ROUTE = freezeWorkerConfig({
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
} as const);

/** SSR isolate: fetch /public data assets when Workers cannot read data/ from disk. */
export const hydrateLeagueDataForPath = cache(async (pathname: string) => {
  beginWorkerIsolateRequest();

  const path = normalizeAppPathname(pathname);

  try {
    if (path === "/" || path.startsWith("/overview")) {
      for (const leagueId of VERIFIED_LIVE_LEAGUE_IDS) {
        await preloadOverviewLeagueRefStats(SITE_URL, leagueId);
      }
      return;
    }

    await preloadLeagueDataForPath(SITE_URL, path);
    await preloadNcaaComponentsForPath(SITE_URL, path);
  } catch (error) {
    console.error("[refwatch] league data hydration failed", path, error);
  }

  if (!pathNeedsGameLogs(path)) return;

  let leagues = leaguesForPath(path);
  try {
    for (const league of leagues) {
      try {
        await preloadGameLogsFromAssets(
          SITE_URL,
          DATA_LEAGUE_FOR_ROUTE[league],
        );
      } catch (error) {
        console.error("[refwatch] game-log hydration failed", league, error);
      }
    }
  } finally {
    leagues = releaseParsedPayload(leagues)!;
  }
});
