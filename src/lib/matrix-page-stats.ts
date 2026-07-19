import {
  preloadGameLogsFromAssets,
  type DataLeague,
} from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { prepareStatsForMatrix } from "@/lib/matrix-ats-enrich";
import { prepareRefStatsForMarketAnalytics } from "@/lib/ref-market-expectation";
import { SITE_URL } from "@/lib/site";
import type { RefStatsFile } from "@/lib/types";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "WNBA",
  mlb: "NBA",
};

/** Hydrate game logs and attach ref×team ATS before matrix compute. */
export async function statsForMatrixPage(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): Promise<RefStatsFile> {
  if (!stats.meta.atsAvailable) return stats;
  await preloadGameLogsFromAssets(SITE_URL, LEAGUE_ID_TO_DATA[leagueId]);
  const withAts = prepareStatsForMatrix(leagueId, stats, scopedSeasons);
  return prepareRefStatsForMarketAnalytics(leagueId, withAts, scopedSeasons);
}
