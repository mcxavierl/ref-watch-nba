import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

export type PulseStripStats = {
  gamesToday: number;
  foulRate: string;
  status: string;
};

function weightedFoulRate(data: CrossLeagueOverview): string {
  const unlocked = data.leagueCards.filter(
    (card) => card.analyticsUnlocked && card.gameCount > 0,
  );
  if (unlocked.length === 0) return "-";

  const weightedSum = unlocked.reduce(
    (sum, card) => sum + card.whistlePerGame * card.gameCount,
    0,
  );
  const gameTotal = unlocked.reduce((sum, card) => sum + card.gameCount, 0);
  if (gameTotal <= 0) return "-";

  return (weightedSum / gameTotal).toFixed(1);
}

/** Derive homepage pulse-strip telemetry from the bundled overview snapshot. */
export function buildPulseStripStats(data: CrossLeagueOverview): PulseStripStats {
  const { upcomingSlate } = data;
  const gamesToday = upcomingSlate.inSeason
    ? upcomingSlate.totalGames + upcomingSlate.totalScheduled
    : 0;

  return {
    gamesToday,
    foulRate: weightedFoulRate(data),
    status: "VERIFIED",
  };
}
