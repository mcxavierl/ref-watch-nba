/**
 * Game-State Neutralization Index (GSNI).
 *
 * Measures how closely a referee's leverage-weighted foul rate tracks the league
 * baseline in comparable game states (score gap × clock).
 */

import { gameWhistleTotal } from "@/lib/whistle-period-splits";
import type { WhistlePeriodSplits } from "@/lib/whistle-period-splits";
import type { NflPenaltyEvent, RefOfficial } from "@/lib/types";

/** Minimum high-leverage minutes before GSNI is surfaced (data honesty gate). */
export const GSNI_MIN_HIGH_LEVERAGE_MINUTES = 50;

/** Leverage weight at or above this threshold counts toward high-leverage minutes. */
export const GSNI_HIGH_LEVERAGE_WEIGHT_FLOOR = 0.7;

const LEVERAGE_WEIGHT_MIN = 0.1;
const LEVERAGE_WEIGHT_MAX = 1.0;

/** Close-game score gap (points) maps to max leverage. */
const GAP_HIGH_THRESHOLD = 5;
/** Blowout score gap maps to min leverage. */
const GAP_LOW_THRESHOLD = 15;

/** Late-clock seconds remaining maps to max leverage. */
const TIME_HIGH_THRESHOLD_SEC = 300;
/** Early-clock seconds remaining maps to min leverage. */
const TIME_LOW_THRESHOLD_SEC = 600;

/** Fouls-per-minute divergence mapped to ±50 GSNI points from neutral (50). */
const GSNI_RATE_SCALE = 200;

export type GsniObservation = {
  scoreDifferential: number;
  timeRemainingSeconds: number;
  fouls: number;
  /** Game-clock minutes represented by this observation window. */
  minutes: number;
};

export type GsniGameData = {
  gameId: string;
  /** Referee slugs (or ids) assigned to this game. */
  refereeIds: string[];
  observations: GsniObservation[];
};

export type GsniGamesCorpus = {
  games: GsniGameData[];
};

export type GsniComputeResult = {
  referee_gsni: number | undefined;
  referee_gsni_volatility: number | undefined;
  highLeverageMinutes: number;
  sampleGames: number;
  weightedFoulRate: number | undefined;
  leagueWeightedFoulRate: number | undefined;
};

type BucketAccumulator = {
  fouls: number;
  minutes: number;
  weightedMinutes: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function linearLeverageComponent(
  value: number,
  highThreshold: number,
  lowThreshold: number,
): number {
  if (!Number.isFinite(value)) return LEVERAGE_WEIGHT_MIN;
  if (value <= highThreshold) return LEVERAGE_WEIGHT_MAX;
  if (value >= lowThreshold) return LEVERAGE_WEIGHT_MIN;
  const span = lowThreshold - highThreshold;
  if (span <= 0) return LEVERAGE_WEIGHT_MIN;
  const t = (value - highThreshold) / span;
  return LEVERAGE_WEIGHT_MAX - t * (LEVERAGE_WEIGHT_MAX - LEVERAGE_WEIGHT_MIN);
}

/**
 * Returns leverage weight in [0.1, 1.0].
 * High leverage: |scoreDiff| < 5 and time < 5 minutes → 1.0.
 * Low leverage: |scoreDiff| > 15 and time > 10 minutes → 0.1.
 */
export function calculateLeverageWeight(
  scoreDiff: number,
  timeRemaining: number,
): number {
  const gap = Math.abs(scoreDiff);
  const time = Math.max(0, timeRemaining);

  const gapWeight = linearLeverageComponent(
    gap,
    GAP_HIGH_THRESHOLD,
    GAP_LOW_THRESHOLD,
  );
  const timeWeight = linearLeverageComponent(
    time,
    TIME_HIGH_THRESHOLD_SEC,
    TIME_LOW_THRESHOLD_SEC,
  );

  return clamp(
    Math.min(gapWeight, timeWeight),
    LEVERAGE_WEIGHT_MIN,
    LEVERAGE_WEIGHT_MAX,
  );
}

export function gsniStateBucketKey(
  scoreDiff: number,
  timeRemainingSeconds: number,
): string {
  const gap = Math.abs(scoreDiff);
  const gapBucket =
    gap <= 5 ? "g1" : gap <= 10 ? "g2" : gap <= 15 ? "g3" : "g4";
  const timeBucket =
    timeRemainingSeconds <= 300
      ? "t1"
      : timeRemainingSeconds <= 600
        ? "t2"
        : timeRemainingSeconds <= 1200
          ? "t3"
          : "t4";
  return `${gapBucket}:${timeBucket}`;
}

function accumulateObservation(
  buckets: Map<string, BucketAccumulator>,
  observation: GsniObservation,
): { weightedMinutes: number; highLeverageMinutes: number } {
  const minutes = Math.max(0, observation.minutes);
  const fouls = Math.max(0, observation.fouls);
  if (minutes <= 0) return { weightedMinutes: 0, highLeverageMinutes: 0 };

  const weight = calculateLeverageWeight(
    observation.scoreDifferential,
    observation.timeRemainingSeconds,
  );
  const weightedMinutes = minutes * weight;
  const key = gsniStateBucketKey(
    observation.scoreDifferential,
    observation.timeRemainingSeconds,
  );

  const row = buckets.get(key) ?? {
    fouls: 0,
    minutes: 0,
    weightedMinutes: 0,
  };
  row.fouls += fouls;
  row.minutes += minutes;
  row.weightedMinutes += weightedMinutes;
  buckets.set(key, row);

  const highLeverageMinutes =
    weight >= GSNI_HIGH_LEVERAGE_WEIGHT_FLOOR ? minutes : 0;

  return { weightedMinutes, highLeverageMinutes };
}

function bucketFoulRate(acc: BucketAccumulator): number | undefined {
  if (acc.minutes <= 0) return undefined;
  return acc.fouls / acc.minutes;
}

function buildLeagueBucketRates(
  gamesData: GsniGamesCorpus,
): Map<string, number> {
  const leagueBuckets = new Map<string, BucketAccumulator>();

  for (const game of gamesData.games) {
    const gameBuckets = new Map<string, BucketAccumulator>();
    for (const observation of game.observations) {
      accumulateObservation(gameBuckets, observation);
    }
    for (const [key, acc] of gameBuckets) {
      const league = leagueBuckets.get(key) ?? {
        fouls: 0,
        minutes: 0,
        weightedMinutes: 0,
      };
      league.fouls += acc.fouls;
      league.minutes += acc.minutes;
      league.weightedMinutes += acc.weightedMinutes;
      leagueBuckets.set(key, league);
    }
  }

  const rates = new Map<string, number>();
  for (const [key, acc] of leagueBuckets) {
    const rate = bucketFoulRate(acc);
    if (rate !== undefined) rates.set(key, rate);
  }
  return rates;
}

function buildRefBucketRates(
  games: GsniGameData[],
): Map<string, BucketAccumulator> {
  const refBuckets = new Map<string, BucketAccumulator>();
  for (const game of games) {
    for (const observation of game.observations) {
      const minutes = Math.max(0, observation.minutes);
      const fouls = Math.max(0, observation.fouls);
      if (minutes <= 0) continue;

      const key = gsniStateBucketKey(
        observation.scoreDifferential,
        observation.timeRemainingSeconds,
      );
      const row = refBuckets.get(key) ?? {
        fouls: 0,
        minutes: 0,
        weightedMinutes: 0,
      };
      row.fouls += fouls;
      row.minutes += minutes;
      row.weightedMinutes += minutes *
        calculateLeverageWeight(
          observation.scoreDifferential,
          observation.timeRemainingSeconds,
        );
      refBuckets.set(key, row);
    }
  }
  return refBuckets;
}

function weightedStateDivergence(
  refBuckets: Map<string, BucketAccumulator>,
  leagueRates: Map<string, number>,
): number | undefined {
  let weightedDelta = 0;
  let refMinutes = 0;

  for (const [key, acc] of refBuckets) {
    const leagueRate = leagueRates.get(key);
    const refRate = bucketFoulRate(acc);
    if (leagueRate === undefined || refRate === undefined) continue;
    weightedDelta += acc.minutes * (refRate - leagueRate);
    refMinutes += acc.minutes;
  }

  if (refMinutes <= 0) return undefined;
  return weightedDelta / refMinutes;
}

function perGameDivergences(
  games: GsniGameData[],
  leagueRates: Map<string, number>,
): number[] {
  const deltas: number[] = [];

  for (const game of games) {
    const gameBuckets = new Map<string, BucketAccumulator>();
    for (const observation of game.observations) {
      const minutes = Math.max(0, observation.minutes);
      const fouls = Math.max(0, observation.fouls);
      if (minutes <= 0) continue;

      const key = gsniStateBucketKey(
        observation.scoreDifferential,
        observation.timeRemainingSeconds,
      );
      const row = gameBuckets.get(key) ?? {
        fouls: 0,
        minutes: 0,
        weightedMinutes: 0,
      };
      row.fouls += fouls;
      row.minutes += minutes;
      gameBuckets.set(key, row);
    }

    let weightedDelta = 0;
    let minutes = 0;
    for (const [key, acc] of gameBuckets) {
      const leagueRate = leagueRates.get(key);
      const gameRate = bucketFoulRate(acc);
      if (leagueRate === undefined || gameRate === undefined) continue;
      weightedDelta += acc.minutes * (gameRate - leagueRate);
      minutes += acc.minutes;
    }
    if (minutes > 0) deltas.push(weightedDelta / minutes);
  }

  return deltas;
}

function stdDev(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function aggregateWeightedFoulRate(
  games: GsniGameData[],
): number | undefined {
  let fouls = 0;
  let weightedMinutes = 0;

  for (const game of games) {
    for (const observation of game.observations) {
      const minutes = Math.max(0, observation.minutes);
      if (minutes <= 0) continue;
      const weight = calculateLeverageWeight(
        observation.scoreDifferential,
        observation.timeRemainingSeconds,
      );
      fouls += Math.max(0, observation.fouls);
      weightedMinutes += minutes * weight;
    }
  }

  if (weightedMinutes <= 0) return undefined;
  return fouls / weightedMinutes;
}

function divergenceToGsni(divergence: number): number {
  return clamp(50 - divergence * GSNI_RATE_SCALE, 0, 100);
}

/**
 * Compute GSNI for one referee against a league games corpus.
 * Returns undefined scores when high-leverage minutes are below the honesty gate.
 */
export function computeGSNI(
  refereeId: string,
  gamesData: GsniGamesCorpus,
): GsniComputeResult {
  const refGames = gamesData.games.filter((game) =>
    game.refereeIds.includes(refereeId),
  );

  let highLeverageMinutes = 0;
  for (const game of refGames) {
    for (const observation of game.observations) {
      const minutes = Math.max(0, observation.minutes);
      if (minutes <= 0) continue;
      const weight = calculateLeverageWeight(
        observation.scoreDifferential,
        observation.timeRemainingSeconds,
      );
      if (weight >= GSNI_HIGH_LEVERAGE_WEIGHT_FLOOR) {
        highLeverageMinutes += minutes;
      }
    }
  }

  const leagueRates = buildLeagueBucketRates(gamesData);
  const refBuckets = buildRefBucketRates(refGames);
  const divergence = weightedStateDivergence(refBuckets, leagueRates);
  const leagueWeightedFoulRate = aggregateWeightedFoulRate(gamesData.games);
  const refWeightedFoulRate = aggregateWeightedFoulRate(refGames);

  if (
    highLeverageMinutes < GSNI_MIN_HIGH_LEVERAGE_MINUTES ||
    divergence === undefined
  ) {
    return {
      referee_gsni: undefined,
      referee_gsni_volatility: undefined,
      highLeverageMinutes: round1(highLeverageMinutes),
      sampleGames: refGames.length,
      weightedFoulRate: refWeightedFoulRate,
      leagueWeightedFoulRate,
    };
  }

  const gameDeltas = perGameDivergences(refGames, leagueRates);
  const volatility = stdDev(gameDeltas);

  return {
    referee_gsni: round1(divergenceToGsni(divergence)),
    referee_gsni_volatility:
      volatility === undefined ? undefined : round2(volatility * 48),
    highLeverageMinutes: round1(highLeverageMinutes),
    sampleGames: refGames.length,
    weightedFoulRate: refWeightedFoulRate,
    leagueWeightedFoulRate,
  };
}

/** Mid-period clock seconds remaining for NBA quarters (12-minute periods). */
const NBA_PERIOD_MID_SECONDS: Record<number, number> = {
  1: 2160,
  2: 1440,
  3: 720,
  4: 360,
};

export function observationsFromWhistlePeriodSplits(
  splits: WhistlePeriodSplits,
  scoreDifferential: number,
  minutesPerPeriod = 12,
): GsniObservation[] {
  return splits.buckets.map((bucket) => ({
    scoreDifferential,
    timeRemainingSeconds:
      NBA_PERIOD_MID_SECONDS[bucket.period] ?? 1440,
    fouls: gameWhistleTotal(bucket),
    minutes: minutesPerPeriod,
  }));
}

export function observationsFromPenaltyEvents(
  events: NflPenaltyEvent[],
  minutesPerFlag = 0.15,
): GsniObservation[] {
  return events.map((event) => ({
    scoreDifferential: event.leverage.scoreDifferential ?? 0,
    timeRemainingSeconds: event.leverage.gameSecondsRemaining ?? 1800,
    fouls: 1,
    minutes: minutesPerFlag,
  }));
}

export function observationsFromGameTotals(input: {
  totalFouls: number;
  homeScore: number;
  awayScore: number;
  minutesPlayed?: number;
}): GsniObservation[] {
  const minutes = input.minutesPlayed ?? 48;
  if (minutes <= 0) return [];
  return [
    {
      scoreDifferential: input.homeScore - input.awayScore,
      timeRemainingSeconds: 1440,
      fouls: input.totalFouls,
      minutes,
    },
  ];
}

export type GsniGameLogLike = {
  gameId: string;
  homeScore: number;
  awayScore: number;
  totalFouls: number;
  officials: RefOfficial[];
  whistlePeriodSplits?: WhistlePeriodSplits;
  penaltyEvents?: NflPenaltyEvent[];
  homeFlags?: number;
  awayFlags?: number;
};

export function extractGsniObservations(
  game: GsniGameLogLike,
): GsniObservation[] {
  if (game.penaltyEvents?.length) {
    return observationsFromPenaltyEvents(game.penaltyEvents);
  }

  if (game.whistlePeriodSplits?.buckets?.length) {
    return observationsFromWhistlePeriodSplits(
      game.whistlePeriodSplits,
      game.homeScore - game.awayScore,
    );
  }

  const totalFouls =
    game.totalFouls ??
    (game.homeFlags !== undefined && game.awayFlags !== undefined
      ? game.homeFlags + game.awayFlags
      : 0);

  return observationsFromGameTotals({
    totalFouls,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
  });
}

export function buildGsniCorpusFromGameLogs(
  games: GsniGameLogLike[],
  refereeIdForOfficial: (official: RefOfficial) => string,
): GsniGamesCorpus {
  return {
    games: games.map((game) => ({
      gameId: game.gameId,
      refereeIds: game.officials.map(refereeIdForOfficial),
      observations: extractGsniObservations(game),
    })),
  };
}

export function attachGsniToProfiles<
  T extends {
    slug: string;
    referee_gsni?: number;
    referee_gsni_volatility?: number;
    gsniHighLeverageMinutes?: number;
    gsniSampleGames?: number;
  },
>(profiles: T[], corpus: GsniGamesCorpus): T[] {
  return profiles.map((profile) => {
    const result = computeGSNI(profile.slug, corpus);
    return {
      ...profile,
      referee_gsni: result.referee_gsni,
      referee_gsni_volatility: result.referee_gsni_volatility,
      gsniHighLeverageMinutes: result.highLeverageMinutes,
      gsniSampleGames: result.sampleGames,
    };
  });
}
