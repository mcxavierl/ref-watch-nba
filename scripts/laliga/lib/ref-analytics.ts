import type { EplRefAnalytics, RefGameRecord } from "../../../src/lib/types";

const LEAGUE_AVG_FOULS = 22;
const LEAGUE_AVG_YELLOW = 3.5;
const LEAGUE_AVG_RED = 0.15;
const LEAGUE_AVG_PENALTIES = 0.28;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface EplGameCardStats {
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  homePenalties?: number;
  awayPenalties?: number;
}

export function computeEplRefAnalytics(
  games: (RefGameRecord & EplGameCardStats)[],
  leagueAvgTotal = 2.8,
  leagueAvgFouls = LEAGUE_AVG_FOULS,
  leagueAvgYellow = LEAGUE_AVG_YELLOW,
  leagueAvgRed = LEAGUE_AVG_RED,
  leagueAvgPenalties = LEAGUE_AVG_PENALTIES,
): EplRefAnalytics | undefined {
  if (games.length < 10) return undefined;

  const avgGoals =
    games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
  const avgFouls =
    games.reduce((s, g) => s + g.totalFouls, 0) / games.length;

  const withCards = games.filter(
    (g) =>
      g.homeYellowCards !== undefined && g.awayYellowCards !== undefined,
  );
  const avgYellow =
    withCards.length > 0
      ? withCards.reduce(
          (s, g) => s + g.homeYellowCards! + g.awayYellowCards!,
          0,
        ) / withCards.length
      : leagueAvgYellow;

  const avgRed =
    withCards.length > 0
      ? withCards.reduce(
          (s, g) => s + g.homeRedCards! + g.awayRedCards!,
          0,
        ) / withCards.length
      : leagueAvgRed;

  const withPenalties = games.filter(
    (g) => g.homePenalties !== undefined && g.awayPenalties !== undefined,
  );
  const avgPenalties =
    withPenalties.length > 0
      ? withPenalties.reduce(
          (s, g) => s + g.homePenalties! + g.awayPenalties!,
          0,
        ) / withPenalties.length
      : leagueAvgPenalties;

  const imbalances = withCards.map((g) =>
    Math.abs(g.homeYellowCards! - g.awayYellowCards!),
  );
  const avgCardImbalance =
    imbalances.length > 0
      ? imbalances.reduce((a, b) => a + b, 0) / imbalances.length
      : 0;
  const balancedGameRate =
    imbalances.length > 0
      ? imbalances.filter((d) => d <= 1).length / imbalances.length
      : 0.5;

  let balanceKind: EplRefAnalytics["balanceKind"] = "neutral";
  if (balancedGameRate >= 0.55 && avgCardImbalance <= 1.2) {
    balanceKind = "balancer";
  } else if (avgCardImbalance >= 1.6 || balancedGameRate <= 0.35) {
    balanceKind = "asymmetric";
  }

  return {
    avgGoalsPerGame: round1(avgGoals),
    goalsDelta: round1(avgGoals - leagueAvgTotal),
    avgFoulsPerGame: round1(avgFouls),
    foulsDelta: round1(avgFouls - leagueAvgFouls),
    avgYellowCardsPerGame: round1(avgYellow),
    yellowCardsDelta: round1(avgYellow - leagueAvgYellow),
    avgRedCardsPerGame: round3(avgRed),
    redCardsDelta: round3(avgRed - leagueAvgRed),
    avgPenaltiesPerGame: round3(avgPenalties),
    penaltiesDelta: round3(avgPenalties - leagueAvgPenalties),
    avgCardImbalance: round1(avgCardImbalance),
    balancedGameRate: round3(balancedGameRate),
    balanceKind,
  };
}

export function computeLeagueAvgYellow(
  games: (RefGameRecord & EplGameCardStats)[],
): number {
  const withCards = games.filter(
    (g) =>
      g.homeYellowCards !== undefined && g.awayYellowCards !== undefined,
  );
  if (withCards.length === 0) return LEAGUE_AVG_YELLOW;
  const total = withCards.reduce(
    (s, g) => s + g.homeYellowCards! + g.awayYellowCards!,
    0,
  );
  return round1(total / withCards.length);
}

export function computeLeagueAvgRed(
  games: (RefGameRecord & EplGameCardStats)[],
): number {
  const withCards = games.filter(
    (g) => g.homeRedCards !== undefined && g.awayRedCards !== undefined,
  );
  if (withCards.length === 0) return LEAGUE_AVG_RED;
  const total = withCards.reduce(
    (s, g) => s + g.homeRedCards! + g.awayRedCards!,
    0,
  );
  return round3(total / withCards.length);
}

export function computeLeagueAvgPenalties(
  games: (RefGameRecord & EplGameCardStats)[],
): number {
  const withPenalties = games.filter(
    (g) => g.homePenalties !== undefined && g.awayPenalties !== undefined,
  );
  if (withPenalties.length === 0) return LEAGUE_AVG_PENALTIES;
  const total = withPenalties.reduce(
    (s, g) => s + g.homePenalties! + g.awayPenalties!,
    0,
  );
  return round3(total / withPenalties.length);
}
