import { cache } from "react";
import { preloadLeagueDataForPath } from "@/lib/edge-preload";
import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
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
  const path = normalizeAppPathname(pathname);

  // Overview hub reads bundled snapshot JSON — skip multi-league ref-stats preload
  // (cold Workers were 500/1019 when parsing five ref-stats payloads per request).
  if (path === "/" || path.startsWith("/overview")) {
    return;
  }

  beginWorkerIsolateRequest();

  try {
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
