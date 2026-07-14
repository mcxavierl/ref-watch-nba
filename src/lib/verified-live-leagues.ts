import { isNcaaConferenceGatedLeague } from "@/lib/ncaa-conference-gate";
import { NCAA_LIVE_LEAGUE_IDS } from "@/lib/ncaa-live-leagues.generated";
import type { LeagueId } from "@/lib/leagues";

/** Verified live leagues with full dashboard + insight pipeline coverage. */
export const PRO_VERIFIED_LIVE_LEAGUE_IDS = [
  "nba",
  "cbb",
  "nhl",
  "nfl",
  "cfb",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

/** Pro leagues in overview chooser, scorecard, and catalog (excludes college). */
export const PRO_ONLY_LIVE_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

/** Overview chooser, pace grid, and quick-list order. */
export const PRIMARY_LIVE_LEAGUE_IDS = [
  "nba",
  "cbb",
  "nhl",
  "nfl",
  "cfb",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

/** NCAA hubs launched on the overview dashboard (independent of build artifact). */
export const LAUNCHED_NCAA_LEAGUE_IDS = [
  "cbb",
  "cfb",
] as const satisfies readonly LeagueId[];

/** @deprecated Alias for LAUNCHED_NCAA_LEAGUE_IDS — college sports live on the overview. */
export const COLLEGE_LIVE_LEAGUE_IDS = LAUNCHED_NCAA_LEAGUE_IDS;

/** Product catalog includes all verified live leagues. */
export const VERIFIED_LIVE_LEAGUE_IDS = [
  ...PRO_VERIFIED_LIVE_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

export function isProVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isProOnlyLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_ONLY_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isCollegeLiveLeague(leagueId: LeagueId): boolean {
  return (LAUNCHED_NCAA_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** NCAA hub has verified conference ingest per build artifact. */
export function isNcaaConferenceGatedLive(leagueId: LeagueId): boolean {
  if (!isNcaaConferenceGatedLeague(leagueId)) return false;
  return (NCAA_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** League is visible in production surfaces. */
export function isVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return isProVerifiedLiveLeague(leagueId);
}

/** Leagues currently exposed in overview grids, chooser, and sidebar. */
export function activeLiveLeagueIds(): LeagueId[] {
  return VERIFIED_LIVE_LEAGUE_IDS.filter((leagueId) => isVerifiedLiveLeague(leagueId));
}
