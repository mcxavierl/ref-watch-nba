import { preloadLeagueRefStats } from "@/lib/edge-preload";
import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";

type TeamsIndexLeagueId =
  | "nba"
  | "nhl"
  | "wnba"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

const DATA_LEAGUE_FOR_ROUTE: Record<TeamsIndexLeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
};

/** Worker-safe preload before team index pages read splits and game counts. */
export async function prepareTeamsIndexPage(leagueId: LeagueId): Promise<void> {
  if (!(leagueId in DATA_LEAGUE_FOR_ROUTE)) return;
  const league = leagueId as TeamsIndexLeagueId;
  await preloadLeagueRefStats(SITE_URL, league, { includeTeamSplits: true });
  await preloadGameLogsFromAssets(SITE_URL, DATA_LEAGUE_FOR_ROUTE[league]);
}
