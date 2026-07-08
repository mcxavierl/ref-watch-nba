import type { NflRefAnalytics, RefGameRecord } from "../../../src/lib/types";

const LEAGUE_AVG_FLAGS = 13;
const LEAGUE_AVG_PENALTY_YARDS = 95;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeNflRefAnalytics(
  games: RefGameRecord[],
  leagueAvgFlags = LEAGUE_AVG_FLAGS,
  leagueAvgPenaltyYards = LEAGUE_AVG_PENALTY_YARDS,
): NflRefAnalytics | undefined {
  const withFlags = games.filter(
    (g) => g.homeFlags !== undefined && g.awayFlags !== undefined,
  );
  if (withFlags.length < 10) return undefined;

  const totalFlags = withFlags.reduce(
    (s, g) => s + (g.homeFlags! + g.awayFlags!),
    0,
  );
  const avgFlagsPerGame = totalFlags / withFlags.length;

  const withYards = withFlags.filter((g) => g.totalPenaltyYards !== undefined);
  const avgPenaltyYardsPerGame =
    withYards.length > 0
      ? withYards.reduce((s, g) => s + g.totalPenaltyYards!, 0) / withYards.length
      : leagueAvgPenaltyYards;

  const imbalances = withFlags.map((g) => Math.abs(g.homeFlags! - g.awayFlags!));
  const avgFlagImbalance =
    imbalances.reduce((a, b) => a + b, 0) / imbalances.length;
  const balancedGameRate =
    imbalances.filter((d) => d <= 1).length / withFlags.length;

  let balanceKind: NflRefAnalytics["balanceKind"] = "neutral";
  if (balancedGameRate >= 0.55 && avgFlagImbalance <= 1.2) {
    balanceKind = "balancer";
  } else if (avgFlagImbalance >= 1.6 || balancedGameRate <= 0.35) {
    balanceKind = "asymmetric";
  }

  return {
    avgFlagsPerGame: round1(avgFlagsPerGame),
    flagsDelta: round1(avgFlagsPerGame - leagueAvgFlags),
    avgPenaltyYardsPerGame: round1(avgPenaltyYardsPerGame),
    penaltyYardsDelta: round1(avgPenaltyYardsPerGame - leagueAvgPenaltyYards),
    avgFlagImbalance: round1(avgFlagImbalance),
    balancedGameRate: round3(balancedGameRate),
    balanceKind,
  };
}

export function computeLeagueAvgFlags(games: RefGameRecord[]): number {
  const withFlags = games.filter(
    (g) => g.homeFlags !== undefined && g.awayFlags !== undefined,
  );
  if (withFlags.length === 0) return LEAGUE_AVG_FLAGS;
  const total = withFlags.reduce(
    (s, g) => s + g.homeFlags! + g.awayFlags!,
    0,
  );
  return Math.round((total / withFlags.length) * 10) / 10;
}

export function computeLeagueAvgPenaltyYards(games: RefGameRecord[]): number {
  const withYards = games.filter((g) => g.totalPenaltyYards !== undefined);
  if (withYards.length === 0) return LEAGUE_AVG_PENALTY_YARDS;
  const total = withYards.reduce((s, g) => s + g.totalPenaltyYards!, 0);
  return Math.round(total / withYards.length);
}
