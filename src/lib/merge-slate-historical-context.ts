import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { buildHistoricalMatchupBaseline } from "@/lib/slate-intelligence";

function slateGameKey(game: OverviewSlateEntry): string {
  return `${game.leagueId}:${game.gameId}`;
}

function historicalContextScore(game: OverviewSlateEntry): number {
  const baseline = buildHistoricalMatchupBaseline(game);
  if (baseline.isEmptyFallback) return 0;

  const h2hGames = Math.max(
    game.preview?.matchupBriefing?.h2hGames ?? 0,
    game.preview?.sampleGames ?? 0,
  );
  if (h2hGames > 0) return 100 + h2hGames;

  if (game.matchupInsight && /meeting/i.test(game.matchupInsight)) return 50;
  if (game.lastMeetingLine) return 40;
  if (baseline.lines.some((line) => /Recent form:/i.test(line))) return 20;

  return 10;
}

/** Keep snapshot or SSR matchup context when live polling rebuilds without game logs. */
export function mergeSlateHistoricalContext(
  polled: OverviewSlateEntry,
  seed: OverviewSlateEntry | undefined,
): OverviewSlateEntry {
  if (!seed) return polled;

  const polledScore = historicalContextScore(polled);
  const seedScore = historicalContextScore(seed);
  if (polledScore >= seedScore) return polled;

  return {
    ...polled,
    matchupInsight: seed.matchupInsight ?? polled.matchupInsight,
    lastMeetingLine: seed.lastMeetingLine ?? polled.lastMeetingLine,
    gameContextLine: seed.gameContextLine ?? polled.gameContextLine,
    teamContextLine: seed.teamContextLine ?? polled.teamContextLine,
    preview: seed.preview
      ? {
          ...(polled.preview ?? seed.preview),
          ...seed.preview,
          matchupBriefing:
            seed.preview.matchupBriefing ?? polled.preview?.matchupBriefing,
        }
      : polled.preview,
    previewCardInsights: seed.previewCardInsights ?? polled.previewCardInsights,
  };
}

export function mergeLiveSlateGamesWithSeed(
  polled: OverviewSlateEntry[],
  seed: OverviewSlateEntry[] | undefined,
): OverviewSlateEntry[] {
  if (!seed?.length) return polled;

  const seedByKey = new Map(seed.map((game) => [slateGameKey(game), game]));
  return polled.map((game) =>
    mergeSlateHistoricalContext(game, seedByKey.get(slateGameKey(game))),
  );
}
