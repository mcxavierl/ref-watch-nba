import { conferenceForGame } from "@/lib/metrics-computer";
import { filterNcaaGameLogs } from "@/lib/ncaa-conference-gate";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { TrendRow } from "@/lib/trends";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";

export type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
export {
  CBB_TRENDS_CONFERENCE_OPTIONS,
  cbbTrendsConferenceLabel,
  cbbTrendsConferenceSlug,
  readCbbTrendsConferenceParam,
} from "@/lib/cbb/conference-trends-shared";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function matchesConferenceScope(
  game: RuntimeGameLogEntry,
  conference: CbbTrendsConferenceScope,
): boolean {
  if (conference === "all") return true;
  return conferenceForGame(game, "cbb") === conference;
}

/** Season-by-season scoring and whistle rows for a CBB conference scope. */
export function buildCbbConferenceTrendRows(
  games: RuntimeGameLogEntry[],
  scopedSeasons: string[],
  conference: CbbTrendsConferenceScope,
): TrendRow[] {
  const seasonSet = new Set(scopedSeasons);
  const scoped = filterNcaaGameLogs(
    "cbb",
    games.filter(
      (game) => seasonSet.has(game.season) && matchesConferenceScope(game, conference),
    ),
  );

  const bySeason = new Map<
    string,
    { games: number; totalPoints: number; totalFouls: number }
  >();

  for (const game of scoped) {
    const bucket = bySeason.get(game.season) ?? {
      games: 0,
      totalPoints: 0,
      totalFouls: 0,
    };
    bucket.games += 1;
    bucket.totalPoints += game.totalPoints;
    bucket.totalFouls += game.totalFouls;
    bySeason.set(game.season, bucket);
  }

  return [...bySeason.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([season, bucket]) => ({
      season,
      gameCount: bucket.games,
      leagueAvgTotal:
        bucket.games > 0 ? round1(bucket.totalPoints / bucket.games) : 0,
      leagueAvgFouls:
        bucket.games > 0 ? round1(bucket.totalFouls / bucket.games) : 0,
    }));
}
