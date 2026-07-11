import { cache } from "react";
import { preloadLeagueDataForPath } from "@/lib/edge-preload";
import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import { leaguesForPath } from "@/lib/ref-stats-preload";
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
  if (pathname.startsWith("/overview")) return;

  await preloadLeagueDataForPath(SITE_URL, pathname);

  const leagues = leaguesForPath(pathname);
  await Promise.all(
    leagues.map((league) =>
      preloadGameLogsFromAssets(SITE_URL, DATA_LEAGUE_FOR_ROUTE[league]),
    ),
  );
});
