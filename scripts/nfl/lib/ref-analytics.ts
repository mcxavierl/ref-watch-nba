import type { NflRefAnalytics, RefGameRecord } from "../../../src/lib/types";
import {
  ESTIMATED_LEVERAGE_PER_FLAG,
  LEAGUE_AVG_HIGH_LEVERAGE_IMPACT,
} from "../../../src/lib/impact-calculator";
import { splitAggregateWhistleCount } from "../../../src/config/penalty-types";

const LEAGUE_AVG_FLAGS = 13;
const LEAGUE_AVG_PENALTY_YARDS = 95;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Prefer referee-only samples; fall back to all crew games when none exist. */
export function nflAnalyticsGameSample(
  refereeGames: RefGameRecord[],
  allGames: RefGameRecord[],
): RefGameRecord[] {
  return refereeGames.length > 0 ? refereeGames : allGames;
}

export function buildNflRefAnalyticsForOfficial(
  refereeGames: RefGameRecord[],
  allGames: RefGameRecord[],
  leagueAvgFlags = LEAGUE_AVG_FLAGS,
  leagueAvgPenaltyYards = LEAGUE_AVG_PENALTY_YARDS,
): NflRefAnalytics | undefined {
  return computeNflRefAnalytics(
    nflAnalyticsGameSample(refereeGames, allGames),
    leagueAvgFlags,
    leagueAvgPenaltyYards,
  );
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
    ...computeLeverageImpactMetrics(withFlags),
    ...computeDispositionMetrics(withFlags),
  };
}

function computeDispositionMetrics(
  games: RefGameRecord[],
): Pick<
  NflRefAnalytics,
  | "avgSubjectiveFlagsPerGame"
  | "subjectiveFlagsDelta"
  | "avgAdministrativeFlagsPerGame"
  | "administrativeFlagsDelta"
  | "subjectiveFlagShare"
  | "dispositionSampleGames"
  | "dispositionEventBackedGames"
> {
  const eligible = games.filter(
    (g) => g.homeFlags !== undefined && g.awayFlags !== undefined,
  );
  if (eligible.length < 10) return {};

  let subjectiveTotal = 0;
  let administrativeTotal = 0;
  let eventBacked = 0;

  for (const game of eligible) {
    if (
      game.subjectiveFlags !== undefined &&
      game.administrativeFlags !== undefined
    ) {
      subjectiveTotal += game.subjectiveFlags;
      administrativeTotal += game.administrativeFlags;
      eventBacked += 1;
      continue;
    }

    const total = game.homeFlags! + game.awayFlags!;
    const split = splitAggregateWhistleCount("nfl", total);
    subjectiveTotal += split.subjective;
    administrativeTotal += split.administrative;
  }

  const avgSubjective = subjectiveTotal / eligible.length;
  const avgAdministrative = administrativeTotal / eligible.length;
  const leagueSubjective = eligible.reduce(
    (sum, g) =>
      sum +
      splitAggregateWhistleCount("nfl", g.homeFlags! + g.awayFlags!).subjective,
    0,
  ) / eligible.length;
  const leagueAdministrative = eligible.reduce(
    (sum, g) =>
      sum +
      splitAggregateWhistleCount("nfl", g.homeFlags! + g.awayFlags!)
        .administrative,
    0,
  ) / eligible.length;

  return {
    avgSubjectiveFlagsPerGame: round1(avgSubjective),
    subjectiveFlagsDelta: round1(avgSubjective - leagueSubjective),
    avgAdministrativeFlagsPerGame: round1(avgAdministrative),
    administrativeFlagsDelta: round1(avgAdministrative - leagueAdministrative),
    subjectiveFlagShare: round3(
      subjectiveTotal / (subjectiveTotal + administrativeTotal || 1),
    ),
    dispositionSampleGames: eligible.length,
    dispositionEventBackedGames: eventBacked > 0 ? eventBacked : undefined,
  };
}

function computeLeverageImpactMetrics(
  games: RefGameRecord[],
  leagueAvgHighLeverageImpact = LEAGUE_AVG_HIGH_LEVERAGE_IMPACT,
): Pick<
  NflRefAnalytics,
  | "avgHighLeverageImpactPerGame"
  | "highLeverageImpactDelta"
  | "highLeverageFlagRate"
  | "leverageSampleGames"
> {
  const withImpact = games.filter(
    (g) =>
      g.highLeverageImpact !== undefined ||
      (g.homeFlags !== undefined && g.awayFlags !== undefined),
  );
  if (withImpact.length < 10) return {};

  let impactTotal = 0;
  let rateTotal = 0;
  let eventBacked = 0;

  for (const game of withImpact) {
    const impact =
      game.highLeverageImpact ??
      (game.homeFlags! + game.awayFlags!) * ESTIMATED_LEVERAGE_PER_FLAG;
    impactTotal += impact;
    if (game.highLeverageFlagRate !== undefined) {
      rateTotal += game.highLeverageFlagRate;
      eventBacked += 1;
    }
  }

  const avgHighLeverageImpactPerGame = impactTotal / withImpact.length;
  const highLeverageFlagRate =
    eventBacked > 0 ? rateTotal / eventBacked : undefined;

  return {
    avgHighLeverageImpactPerGame: round1(avgHighLeverageImpactPerGame),
    highLeverageImpactDelta: round1(
      avgHighLeverageImpactPerGame - leagueAvgHighLeverageImpact,
    ),
    highLeverageFlagRate:
      highLeverageFlagRate !== undefined
        ? round3(highLeverageFlagRate)
        : undefined,
    leverageSampleGames: eventBacked > 0 ? eventBacked : undefined,
  };
}

export function computeLeagueAvgHighLeverageImpact(
  games: RefGameRecord[],
): number {
  const metrics = computeLeverageImpactMetrics(games);
  return metrics.avgHighLeverageImpactPerGame ?? LEAGUE_AVG_HIGH_LEVERAGE_IMPACT;
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
