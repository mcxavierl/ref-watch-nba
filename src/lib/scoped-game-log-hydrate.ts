import {
  preloadGameLogsFromAssets,
  preloadNbaGameLogSeasons,
} from "@/lib/game-logs-preload";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { LeagueId } from "@/lib/leagues";
import {
  isEraScopeMode,
  resolveScopedSeasonsForLeague,
  usesPatriotsEraScope,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { RefStatsFile } from "@/lib/types";

function seasonsWithGameData(stats: RefStatsFile): string[] {
  const covered = new Set<string>();
  for (const ref of stats.refs) {
    for (const season of ref.seasons) covered.add(season);
  }
  const pool = [...stats.meta.seasons].sort();
  const filtered = pool.filter((season) => covered.has(season));
  return filtered.length > 0 ? filtered : pool;
}

/** Fetch only the game-log seasons needed for scoped rebuilds (Worker-safe). */
export async function hydrateScopedGameLogs(
  origin: string,
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
  options?: { teamAbbr?: string },
): Promise<void> {
  const { stats } = loadLeagueStats(leagueId);
  const scopedSeasons = resolveScopedSeasonsForLeague(
    leagueId,
    scopeMode,
    seasonsWithGameData(stats),
  );

  if (leagueId === "nba") {
    await preloadNbaGameLogSeasons(origin, scopedSeasons);
    return;
  }

  if (
    leagueId === "nfl" &&
    usesPatriotsEraScope(leagueId, { teamAbbr: options?.teamAbbr }) &&
    isEraScopeMode(scopeMode)
  ) {
    await preloadGameLogsFromAssets(origin, "NFL");
  }
}
