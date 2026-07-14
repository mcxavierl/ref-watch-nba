import type { LeagueId } from "@/lib/leagues";

export const DASHBOARD_GRID_LEAGUE_IDS = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const satisfies readonly LeagueId[];

/** Dashboard grid cards render for every configured league (including locked NCAA). */
export function isDashboardLeagueExposed(leagueId: LeagueId): boolean {
  return (DASHBOARD_GRID_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}
