import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

export type TrustBarStats = {
  gamesAnalyzed: number;
  officials: number;
  seasons: number;
};

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Derive homepage trust-bar counts from the bundled overview snapshot. */
export function buildTrustBarStats(data: CrossLeagueOverview): TrustBarStats {
  const unlocked = data.leagueCards.filter((card) => card.analyticsUnlocked);
  const seasons =
    unlocked.length > 0
      ? Math.max(...unlocked.map((card) => card.seasonCount))
      : 0;

  return {
    gamesAnalyzed: data.totalGames,
    officials: data.totalRefs,
    seasons,
  };
}

export function formatTrustBarSegment(stats: TrustBarStats): string[] {
  return [
    `${formatCount(stats.gamesAnalyzed)} Games Analyzed`,
    `${formatCount(stats.officials)} Officials`,
    `${formatCount(stats.seasons)} Seasons`,
    "Historical Archive",
  ];
}
