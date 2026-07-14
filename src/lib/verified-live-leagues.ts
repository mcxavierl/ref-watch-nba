import {
  hasNcaaLiveConferenceCoverage,
  isNcaaConferenceGatedLeague,
  NCAA_CONFERENCE_GATED_LEAGUE_IDS,
} from "@/lib/ncaa-conference-gate";
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";
import type { LeagueId } from "@/lib/leagues";

/** Pro leagues with full-league verified ingest. */
export const PRO_VERIFIED_LIVE_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

/** Product catalog includes conference-gated NCAA when live data exists. */
export const VERIFIED_LIVE_LEAGUE_IDS = [
  ...PRO_VERIFIED_LIVE_LEAGUE_IDS,
  ...NCAA_CONFERENCE_GATED_LEAGUE_IDS,
] as const satisfies readonly LeagueId[];

const NCAA_STATS_LOADERS = {
  cbb: getCbbRefStats,
  cfb: getCfbRefStats,
} as const;

export function isProVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (PRO_VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isNcaaConferenceGatedLive(leagueId: LeagueId): boolean {
  if (!isNcaaConferenceGatedLeague(leagueId)) return false;
  try {
    const stats = NCAA_STATS_LOADERS[leagueId]();
    return hasNcaaLiveConferenceCoverage(leagueId, stats);
  } catch {
    return false;
  }
}

/** League is visible in production surfaces (pro always; NCAA when conference data exists). */
export function isVerifiedLiveLeague(leagueId: LeagueId): boolean {
  if (isProVerifiedLiveLeague(leagueId)) return true;
  return isNcaaConferenceGatedLive(leagueId);
}

/** Leagues currently exposed in overview grids, chooser, and sidebar. */
export function activeLiveLeagueIds(): LeagueId[] {
  return VERIFIED_LIVE_LEAGUE_IDS.filter((leagueId) => isVerifiedLiveLeague(leagueId));
}
