import type { RefProfile, RefStatsFile } from "@/lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function refSoccerAnalytics(ref: RefProfile) {
  return ref.eplAnalytics;
}

/** League-wide yellow + red cards per game (EPL / La Liga). */
export function leagueCardsPerGame(stats: RefStatsFile): number {
  const yellow = stats.meta.leagueAvgYellowCards;
  const red = stats.meta.leagueAvgRedCards;
  if (
    yellow !== undefined &&
    red !== undefined &&
    Number.isFinite(yellow) &&
    Number.isFinite(red) &&
    yellow + red > 0
  ) {
    return yellow + red;
  }

  let weightedYellow = 0;
  let weightedRed = 0;
  let games = 0;
  for (const ref of stats.refs) {
    const analytics = refSoccerAnalytics(ref);
    if (!analytics || ref.games < 1) continue;
    weightedYellow += analytics.avgYellowCardsPerGame * ref.games;
    weightedRed += analytics.avgRedCardsPerGame * ref.games;
    games += ref.games;
  }
  if (games > 0) {
    return (weightedYellow + weightedRed) / games;
  }

  return 0;
}

/** Backfill meta card averages when ingest omitted them (football-data EPL builds). */
export function enrichSoccerCardMeta(stats: RefStatsFile): RefStatsFile {
  const yellow = stats.meta.leagueAvgYellowCards;
  const red = stats.meta.leagueAvgRedCards;
  if (
    yellow !== undefined &&
    red !== undefined &&
    Number.isFinite(yellow) &&
    Number.isFinite(red) &&
    yellow + red > 0
  ) {
    return stats;
  }

  let weightedYellow = 0;
  let weightedRed = 0;
  let games = 0;
  for (const ref of stats.refs) {
    const analytics = refSoccerAnalytics(ref);
    if (!analytics || ref.games < 1) continue;
    weightedYellow += analytics.avgYellowCardsPerGame * ref.games;
    weightedRed += analytics.avgRedCardsPerGame * ref.games;
    games += ref.games;
  }
  if (games <= 0) return stats;

  return {
    ...stats,
    meta: {
      ...stats.meta,
      leagueAvgYellowCards: round1(weightedYellow / games),
      leagueAvgRedCards: round3(weightedRed / games),
    },
  };
}
