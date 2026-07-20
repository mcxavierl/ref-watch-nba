import { isNcaaConferenceGatedLeague } from "@/lib/ncaa-conference-gate";
import { NCAA_LIVE_LEAGUE_IDS } from "@/lib/ncaa-live-leagues.generated";
import type { LeagueId } from "@/lib/leagues";

/** Verified live leagues with full dashboard + insight pipeline coverage. */
/** Pro leagues with full matrix, friction, and ref-profile analytics. */
export const PRO_MATRIX_ANALYTICS_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "wnba",
] as const satisfies readonly LeagueId[];

export const PRO_VERIFIED_LIVE_LEAGUE_IDS = [
  ...PRO_MATRIX_ANALYTICS_LEAGUE_IDS,
  "wnba",
] as const satisfies readonly LeagueId[];

/** Pro leagues with live slate and assignments before ref-stats ingest is verified. */
export const PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS = [] as const satisfies readonly LeagueId[];

/** Pro leagues in overview chooser, scorecard, and catalog (excludes college). */
export const PRO_ONLY_LIVE_LEAGUE_IDS = [
  ...PRO_VERIFIED_LIVE_LEAGUE_IDS,
  ...PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

/** NCAA hubs on the overview dashboard - CBB live with power-conference gate. */
export const LAUNCHED_NCAA_LEAGUE_IDS = ["cbb"] as const satisfies readonly LeagueId[];

/** Overview hub chooser, pace grid, and quick-list order (pro leagues + launched NCAA). */
export const OVERVIEW_HUB_LEAGUE_IDS = [
  ...PRO_ONLY_LIVE_LEAGUE_IDS,
  ...LAUNCHED_NCAA_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

/** Leagues with matrix insight cards on the overview dashboard. */
export const OVERVIEW_INSIGHT_LEAGUE_IDS = [
  ...PRO_MATRIX_ANALYTICS_LEAGUE_IDS,
  ...LAUNCHED_NCAA_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

/** @deprecated Alias for OVERVIEW_HUB_LEAGUE_IDS - overview surfaces use all six leagues. */
export const PRIMARY_LIVE_LEAGUE_IDS = OVERVIEW_HUB_LEAGUE_IDS;

/** @deprecated Alias for LAUNCHED_NCAA_LEAGUE_IDS - college sports live on the overview. */
export const COLLEGE_LIVE_LEAGUE_IDS = LAUNCHED_NCAA_LEAGUE_IDS;

/** Product catalog includes pro leagues plus launched NCAA hubs. */
export const VERIFIED_LIVE_LEAGUE_IDS = [
  ...PRO_VERIFIED_LIVE_LEAGUE_IDS,
  ...PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS,
  ...LAUNCHED_NCAA_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

export function isProVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isProOnlyLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_ONLY_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isProAssignmentsLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isCollegeLiveLeague(leagueId: LeagueId): boolean {
  return (LAUNCHED_NCAA_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** NCAA hub has verified conference ingest per build artifact. */
export function isNcaaConferenceGatedLive(leagueId: LeagueId): boolean {
  if (!isNcaaConferenceGatedLeague(leagueId)) return false;
  return (NCAA_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** League is visible in production surfaces (pro leagues + launched NCAA hubs). */
export function isVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (
    isProVerifiedLiveLeague(leagueId) ||
    isProAssignmentsLiveLeague(leagueId) ||
    isCollegeLiveLeague(leagueId)
  );
}

/** Leagues currently exposed in overview grids, chooser, and sidebar. */
export function activeLiveLeagueIds(): LeagueId[] {
  return VERIFIED_LIVE_LEAGUE_IDS.filter((leagueId) => isVerifiedLiveLeague(leagueId));
}
