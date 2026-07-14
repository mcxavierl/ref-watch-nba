import type { LeagueId } from "@/lib/leagues";
import {
  isVerifiedLiveLeague,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "@/lib/league-verification";

/** Dashboard surfaces only show verified live leagues. */
export const DASHBOARD_GRID_LEAGUE_IDS = VERIFIED_LIVE_LEAGUE_IDS;

/** Grid cards, chooser, and pace panels render only for verified live leagues. */
export function isDashboardLeagueExposed(leagueId: LeagueId): boolean {
  return isVerifiedLiveLeague(leagueId);
}
