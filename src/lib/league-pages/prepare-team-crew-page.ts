import { preloadLeagueRefStats } from "@/lib/edge-preload";
import { hydrateScopedGameLogs } from "@/lib/scoped-game-log-hydrate";
import {
  DEFAULT_SEASON_SCOPE_MODE,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import { SITE_URL } from "@/lib/site";

type TeamCrewLeagueId =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

/** Worker-safe preload before TeamCrewPage reads game logs for close-game stats. */
export async function prepareTeamCrewPage(
  leagueId: TeamCrewLeagueId,
  teamAbbr: string,
  scopeMode: SeasonScopeMode = DEFAULT_SEASON_SCOPE_MODE,
): Promise<void> {
  await preloadLeagueRefStats(SITE_URL, leagueId, { includeTeamSplits: true });
  await hydrateScopedGameLogs(SITE_URL, leagueId, scopeMode, { teamAbbr });
}
