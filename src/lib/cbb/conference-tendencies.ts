import { conferenceForGame } from "@/lib/metrics-computer";
import { filterNcaaGameLogs } from "@/lib/ncaa-conference-gate";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { rebuildScopedRefStatsFromGames } from "@/lib/scoped-ref-stats";
import type { RefStatsFile } from "@/lib/types";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";

function matchesConferenceScope(
  game: Parameters<typeof conferenceForGame>[0],
  conference: CbbTrendsConferenceScope,
): boolean {
  if (conference === "all") return true;
  return conferenceForGame(game, "cbb") === conference;
}

function stripRefForHub<T extends RefStatsFile["refs"][number]>(ref: T): T {
  return {
    ...ref,
    recentGames: [],
    teamStats: {},
  };
}

/** Ref tendencies scoped to one CBB conference (or pass-through for all). */
export function buildCbbConferenceTendenciesStats(
  base: RefStatsFile,
  scopedSeasons: string[],
  conference: CbbTrendsConferenceScope,
): RefStatsFile {
  if (conference === "all") return base;

  const games = loadRuntimeGameLogs("CBB")?.games ?? [];
  const seasonSet = new Set(scopedSeasons);
  const filtered = filterNcaaGameLogs(
    "cbb",
    games.filter(
      (game) =>
        seasonSet.has(game.season) &&
        matchesConferenceScope(game, conference),
    ),
  );

  const rebuilt = rebuildScopedRefStatsFromGames(
    "cbb",
    base,
    filtered,
    scopedSeasons,
    { includeTeamSplits: false },
  );

  return {
    ...rebuilt,
    teamSplits: {},
    refs: rebuilt.refs.map(stripRefForHub),
  };
}
