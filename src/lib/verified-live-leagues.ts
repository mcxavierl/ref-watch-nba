import type { LeagueId } from "@/lib/leagues";

/** Production leagues with verified real-source ingest — never show synthetic UI. */
export const VERIFIED_LIVE_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
] as const satisfies readonly LeagueId[];

export function isVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}
