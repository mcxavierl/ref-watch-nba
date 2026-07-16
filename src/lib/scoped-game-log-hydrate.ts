import {
  preloadGameLogsFromAssets,
  preloadNbaGameLogSeasons,
  type DataLeague,
} from "@/lib/game-logs-preload";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { LeagueId } from "@/lib/leagues";
import {
  resolveScopedSeasonsForLeague,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { RefStatsFile } from "@/lib/types";

const LEAGUE_DATA_MAP: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

function seasonsWithGameData(stats: RefStatsFile): string[] {
  const covered = new Set<string>();
  for (const ref of stats.refs) {
    for (const season of ref.seasons) covered.add(season);
  }
  const pool = [...stats.meta.seasons].sort();
  const filtered = pool.filter((season) => covered.has(season));
  return filtered.length > 0 ? filtered : pool;
}

/** Fetch game-log seasons needed for scoped rebuilds (Worker-safe). */
export async function hydrateScopedGameLogs(
  origin: string,
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
  _options?: { teamAbbr?: string },
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

  const dataLeague = LEAGUE_DATA_MAP[leagueId];
  if (dataLeague) {
    await preloadGameLogsFromAssets(origin, dataLeague);
  }
}
