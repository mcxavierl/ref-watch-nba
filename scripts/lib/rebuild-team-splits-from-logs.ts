import { leagueTenSeasons } from "../../src/lib/league-seasons";
import type { LeagueId } from "../../src/lib/leagues";
import { rebuildScopedRefStatsFromGames } from "../../src/lib/scoped-ref-stats";
import type { TeamCrewSplit } from "../../src/lib/types";
import type { GameLogFile } from "./game-logs";
import type { RefStatsFile } from "./types";

const SCRIPT_LEAGUE_TO_ID: Record<string, LeagueId> = {
  nba: "nba",
  nfl: "nfl",
  nhl: "nhl",
  epl: "epl",
  laliga: "laliga",
  cbb: "cbb",
  cfb: "cfb",
  wnba: "wnba",
};

/** Rebuild team crew splits from game logs for the league ten-season window. */
export function rebuildTeamSplitsFromGameLogs(
  leagueKey: string,
  stats: RefStatsFile,
  logs: GameLogFile,
): Record<string, TeamCrewSplit[]> {
  const leagueId = SCRIPT_LEAGUE_TO_ID[leagueKey];
  if (!leagueId) return stats.teamSplits ?? {};

  const seasons = [...leagueTenSeasons(leagueId)];
  const seasonSet = new Set(seasons);
  const filtered = logs.games.filter(
    (game) => game.season && seasonSet.has(game.season),
  );
  if (filtered.length === 0) return stats.teamSplits ?? {};

  const rebuilt = rebuildScopedRefStatsFromGames(
    leagueId,
    stats,
    filtered,
    seasons,
    { includeTeamSplits: true },
  );
  return rebuilt.teamSplits ?? {};
}
