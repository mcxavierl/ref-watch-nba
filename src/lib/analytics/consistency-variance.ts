import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";
import { populationStdDev } from "@/lib/metric-significance";

export const CONSISTENCY_INDEX_NEUTRAL = 50;
export const CONSISTENCY_MIN_GAMES = SAMPLE_SIZE_THRESHOLD;
export const CONSISTENCY_ROBOTIC_THRESHOLD = 70;
export const CONSISTENCY_VOLATILE_THRESHOLD = 40;

export type ConsistencyClassificationLabel =
  | "robotic-low-variance"
  | "league-average"
  | "volatile-high-variance"
  | "insufficient-sample";

export const CONSISTENCY_CLASSIFICATION_DISPLAY: Record<
  Exclude<ConsistencyClassificationLabel, "insufficient-sample">,
  string
> = {
  "robotic-low-variance": "Robotic / Low-Variance",
  "league-average": "League Average",
  "volatile-high-variance": "Volatile / High-Variance",
};

export type ConsistencyVarianceResult = {
  consistency_index: number | null;
  consistency_classification_label: ConsistencyClassificationLabel;
  whistle_std_dev: number | null;
  league_whistle_std_dev: number | null;
  sample_games: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Population standard deviation of per-game whistle totals across a league sample. */
export function leagueWhistleStdDevFromGameTotals(
  perGameWhistleTotals: number[],
): number {
  if (perGameWhistleTotals.length === 0) return 0;
  return populationStdDev(perGameWhistleTotals);
}

/** Standard deviation of an official's per-game whistle totals. */
export function officialWhistleStdDev(perGameWhistles: number[]): number | null {
  if (perGameWhistles.length === 0) return null;
  return populationStdDev(perGameWhistles);
}

/**
 * Normalize official σ against league σ on a 0-100 scale.
 * 100 = perfectly stable, 50 = league-average variance, 0 = 2x league variance.
 */
export function computeConsistencyIndex(
  officialStdDev: number,
  leagueStdDev: number,
): number {
  if (leagueStdDev <= 0) return CONSISTENCY_INDEX_NEUTRAL;
  const ratio = officialStdDev / leagueStdDev;
  const raw = 100 - (ratio / 2) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function classifyConsistencyLabel(
  consistencyIndex: number | null,
  sampleGames: number,
  minSampleGames: number = CONSISTENCY_MIN_GAMES,
): ConsistencyClassificationLabel {
  if (
    consistencyIndex === null ||
    sampleGames < minSampleGames
  ) {
    return "insufficient-sample";
  }
  if (consistencyIndex >= CONSISTENCY_ROBOTIC_THRESHOLD) {
    return "robotic-low-variance";
  }
  if (consistencyIndex >= CONSISTENCY_VOLATILE_THRESHOLD) {
    return "league-average";
  }
  return "volatile-high-variance";
}

export function consistencyClassificationDisplayLabel(
  label: ConsistencyClassificationLabel,
): string {
  if (label === "insufficient-sample") return "Insufficient whistle sample";
  return CONSISTENCY_CLASSIFICATION_DISPLAY[label];
}

/** Bridge legacy 1-10 consistency_score consumers from the 0-100 index. */
export function legacyConsistencyScoreFromIndex(
  consistencyIndex: number | null,
): number | null {
  if (consistencyIndex === null) return null;
  return Math.max(1, Math.min(10, Math.round(consistencyIndex / 10)));
}

export function computeConsistencyVariance(
  perGameWhistles: number[],
  leagueStdDev: number,
  options?: { minSampleGames?: number },
): ConsistencyVarianceResult {
  const minSampleGames = options?.minSampleGames ?? CONSISTENCY_MIN_GAMES;
  const officialStdDev = officialWhistleStdDev(perGameWhistles);

  let consistencyIndex: number | null = null;
  if (
    officialStdDev !== null &&
    perGameWhistles.length >= minSampleGames &&
    leagueStdDev > 0
  ) {
    consistencyIndex = computeConsistencyIndex(officialStdDev, leagueStdDev);
  }

  return {
    consistency_index: consistencyIndex,
    consistency_classification_label: classifyConsistencyLabel(
      consistencyIndex,
      perGameWhistles.length,
      minSampleGames,
    ),
    whistle_std_dev:
      officialStdDev !== null ? round1(officialStdDev) : null,
    league_whistle_std_dev: leagueStdDev > 0 ? round1(leagueStdDev) : null,
    sample_games: perGameWhistles.length,
  };
}

export function consistencyFieldsFromResult(
  result: ConsistencyVarianceResult,
): Pick<
  import("@/lib/types").OfficialStats,
  | "consistency_index"
  | "consistency_classification_label"
  | "whistle_std_dev"
  | "league_whistle_std_dev"
> {
  return {
    consistency_index: result.consistency_index,
    consistency_classification_label: result.consistency_classification_label,
    whistle_std_dev: result.whistle_std_dev,
    league_whistle_std_dev: result.league_whistle_std_dev,
  };
}
