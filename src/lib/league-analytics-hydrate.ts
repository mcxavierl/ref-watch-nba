import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { isFrictionMatrixLeague } from "@/lib/friction-matrix";
import { preloadPersonnelProfilesFromAssets } from "@/lib/personnel-profiles";
import { SITE_URL } from "@/lib/site";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "NBA",
  mlb: "NBA",
};

/** Load game logs (+ personnel for friction leagues) before analytics compute on Workers. */
export async function hydrateLeagueAnalyticsData(
  leagueId: LeagueId,
): Promise<void> {
  const dataLeague = LEAGUE_ID_TO_DATA[leagueId];
  const tasks: Promise<void>[] = [
    preloadGameLogsFromAssets(SITE_URL, dataLeague),
  ];
  if (isFrictionMatrixLeague(leagueId)) {
    tasks.push(preloadPersonnelProfilesFromAssets(SITE_URL, leagueId));
  }
  await Promise.all(tasks);
}

/** @deprecated Use hydrateLeagueAnalyticsData */
export const hydrateInsightsFindingsData = hydrateLeagueAnalyticsData;
