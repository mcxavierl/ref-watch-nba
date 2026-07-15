import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import {
  isFrictionMatrixLeague,
  preloadPersonnelProfilesFromAssets,
} from "@/lib/personnel-profiles";
import { SITE_URL } from "@/lib/site";

const FRICTION_DATA_LEAGUE: Record<
  "nba" | "nfl" | "nhl",
  DataLeague
> = {
  nba: "NBA",
  nfl: "NFL",
  nhl: "NHL",
};

/** Load game logs + personnel sidecars before friction matrix compute on Workers. */
export async function hydrateInsightsFindingsData(
  leagueId: LeagueId,
): Promise<void> {
  if (!isFrictionMatrixLeague(leagueId)) return;

  const dataLeague = FRICTION_DATA_LEAGUE[leagueId];
  await Promise.all([
    preloadGameLogsFromAssets(SITE_URL, dataLeague),
    preloadPersonnelProfilesFromAssets(SITE_URL, leagueId),
  ]);
}
