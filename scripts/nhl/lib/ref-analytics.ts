import type { NhlRefAnalytics, RefGameRecord } from "../../../src/lib/types";

const LEAGUE_AVG_MINORS = 5.5;
const LEAGUE_OT_RATE = 0.23;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeNhlRefAnalytics(
  games: RefGameRecord[],
  leagueAvgMinors = LEAGUE_AVG_MINORS,
): NhlRefAnalytics | undefined {
  const withMinors = games.filter(
    (g) =>
      g.homeMinors !== undefined &&
      g.awayMinors !== undefined,
  );
  if (withMinors.length < 10) return undefined;

  const totalMinors = withMinors.reduce(
    (s, g) => s + (g.homeMinors! + g.awayMinors!),
    0,
  );
  const avgMinorsPerGame = totalMinors / withMinors.length;

  const otGames = withMinors.filter((g) => g.wentToOvertime).length;
  const overtimeRate = otGames / withMinors.length;

  const imbalances = withMinors.map((g) =>
    Math.abs(g.homeMinors! - g.awayMinors!),
  );
  const avgMinorImbalance =
    imbalances.reduce((a, b) => a + b, 0) / imbalances.length;
  const balancedGameRate =
    imbalances.filter((d) => d <= 1).length / withMinors.length;

  let balanceKind: NhlRefAnalytics["balanceKind"] = "neutral";
  if (balancedGameRate >= 0.55 && avgMinorImbalance <= 1.2) {
    balanceKind = "balancer";
  } else if (avgMinorImbalance >= 1.6 || balancedGameRate <= 0.35) {
    balanceKind = "asymmetric";
  }

  return {
    avgMinorsPerGame: round1(avgMinorsPerGame),
    minorsDelta: round1(avgMinorsPerGame - leagueAvgMinors),
    overtimeRate: round3(overtimeRate),
    overtimeGames: otGames,
    avgMinorImbalance: round1(avgMinorImbalance),
    balancedGameRate: round3(balancedGameRate),
    balanceKind,
  };
}

export function computeLeagueOvertimeRate(games: RefGameRecord[]): number {
  const withFlag = games.filter((g) => g.wentToOvertime !== undefined);
  if (withFlag.length === 0) return LEAGUE_OT_RATE;
  return (
    Math.round(
      (withFlag.filter((g) => g.wentToOvertime).length / withFlag.length) * 1000,
    ) / 1000
  );
}

export function computeLeagueAvgMinors(games: RefGameRecord[]): number {
  const withMinors = games.filter(
    (g) => g.homeMinors !== undefined && g.awayMinors !== undefined,
  );
  if (withMinors.length === 0) return LEAGUE_AVG_MINORS;
  const total = withMinors.reduce(
    (s, g) => s + g.homeMinors! + g.awayMinors!,
    0,
  );
  return Math.round((total / withMinors.length) * 10) / 10;
}

export { LEAGUE_AVG_MINORS, LEAGUE_OT_RATE };
