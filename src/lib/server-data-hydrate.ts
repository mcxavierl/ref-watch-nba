import { cache } from "react";
import { preloadGameLogsFromAssets, type DataLeague } from "@/lib/game-logs-preload";
import {
  leaguesForPath,
  preloadRefStatsFromAssets,
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
  cbb: "CBB",
  cfb: "CFB",
};

/** SSR isolate: fetch /public data assets when Workers cannot read data/ from disk. */
export const hydrateLeagueDataForPath = cache(async (pathname: string) => {
  const leagues = leaguesForPath(pathname);
  await Promise.all(
    leagues.flatMap((league) => [
      preloadRefStatsFromAssets(SITE_URL, league),
      preloadGameLogsFromAssets(SITE_URL, DATA_LEAGUE_FOR_ROUTE[league]),
    ]),
  );
});
