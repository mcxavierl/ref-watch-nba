/**
 * Data honesty helpers for standout splits: Bayesian shrinkage, sample gating,
 * and data maturity tiers for user-facing insight cards.
 */

/** Minimum games before raw delta is shown as the primary metric. */
export const RELIABILITY_FLOOR_GAMES = 15;

/** Prior pseudo-count for empirical-Bayes shrinkage toward league mean (zero delta). */
export const BAYESIAN_PRIOR_STRENGTH = 15;

/** Target sample depth for full data maturity (games). */
export const MATURITY_TARGET_GAMES = 20;

export const DELTA_HONESTY_FOOTNOTE =
  "Deltas represent preliminary trends; sample sizes < 20 games are subject to higher volatility.";

export const STANDOUT_SPLIT_FOOTNOTE = DELTA_HONESTY_FOOTNOTE;

export type DataMaturityTier =
  | "Low Maturity"
  | "Moderate Maturity"
  | "High Maturity";

export type WinRateDeltaDisplay = {
  rawDelta: number;
  displayDelta: number;
  isPreliminary: boolean;
  isAdjusted: boolean;
};

export function isPreliminarySample(sampleSize: number): boolean {
  return sampleSize > 0 && sampleSize < RELIABILITY_FLOOR_GAMES;
}

/**
 * Shrink an observed delta toward 0 (league / team baseline mean) using
 * empirical Bayes: adjusted = raw * n / (n + k).
 */
export function bayesianShrinkDelta(
  rawDelta: number,
  sampleSize: number,
  priorStrength = BAYESIAN_PRIOR_STRENGTH,
): number {
  if (!Number.isFinite(rawDelta) || sampleSize <= 0) return 0;
  const weight = sampleSize / (sampleSize + priorStrength);
  return rawDelta * weight;
}

/** Pick raw or shrunk delta for display based on the reliability floor. */
export function displayWinRateDelta(
  rawDelta: number,
  sampleSize: number,
): WinRateDeltaDisplay {
  const isPreliminary = isPreliminarySample(sampleSize);
  const displayDelta = isPreliminary
    ? bayesianShrinkDelta(rawDelta, sampleSize)
    : rawDelta;
  return {
    rawDelta,
    displayDelta,
    isPreliminary,
    isAdjusted: isPreliminary,
  };
}

/** Progress bar fill: (sampleSize / 20) * 100, capped at 100%. */
export function dataMaturityPercent(sampleSize: number): number {
  if (!Number.isFinite(sampleSize) || sampleSize <= 0) return 0;
  return Math.min(100, Math.round((sampleSize / MATURITY_TARGET_GAMES) * 100));
}

export function adjustedDeltaTooltipText(
  displayDelta: number,
  sampleSize?: number,
): string {
  if (sampleSize === undefined) {
    return adjustedDeltaFootnote(displayDelta);
  }
  return `Adjusted (N=${sampleSize}). Empirical Bayes shrinkage toward league mean. Displayed delta: ${formatDeltaPp(displayDelta)}.`;
}

/** @deprecated Prefer adjustedDeltaTooltipText with sample size. */
export function adjustedDeltaFootnote(displayDelta: number): string {
  return `Adjusted for small sample: ${formatDeltaPp(displayDelta)}`;
}

export function formatDeltaPp(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

export function formatSampleSizeLabel(games: number): string {
  if (games <= 0) return "0 games";
  return `${games.toLocaleString()} game${games === 1 ? "" : "s"}`;
}

/** Sample-confidence tiers for matrix standout split cards. */
export type MatrixSampleConfidenceTier = "high" | "moderate" | "low";

export function matrixSampleConfidenceTier(
  games: number,
): MatrixSampleConfidenceTier {
  if (games >= 10) return "high";
  if (games >= 5) return "moderate";
  return "low";
}

export function matrixSampleConfidenceLabel(
  tier: MatrixSampleConfidenceTier,
): string {
  switch (tier) {
    case "high":
      return "10+ games";
    case "moderate":
      return "5-9 games";
    case "low":
      return "<5 games";
  }
}

/** 0-100 maturity score from sample depth and optional effect magnitude. */
export function dataMaturityScore(
  sampleSize: number,
  effectMagnitude = 0,
): number {
  let sampleScore: number;
  if (sampleSize >= 100) {
    sampleScore = 72 + Math.min(28, (sampleSize - 100) * 0.12);
  } else if (sampleSize >= 30) {
    sampleScore = 42 + ((sampleSize - 30) / 70) * 30;
  } else if (sampleSize >= 8) {
    sampleScore = 18 + ((sampleSize - 8) / 22) * 24;
  } else {
    sampleScore = Math.max(8, sampleSize * 2.5);
  }

  const effectBoost = Math.min(12, Math.abs(effectMagnitude) * 0.15);
  return Math.round(Math.min(100, Math.max(5, sampleScore + effectBoost)));
}

export function dataMaturityTier(score: number): DataMaturityTier {
  if (score < 30) return "Low Maturity";
  if (score < 60) return "Moderate Maturity";
  return "High Maturity";
}

export function dataMaturityTierSlug(tier: DataMaturityTier): string {
  switch (tier) {
    case "Low Maturity":
      return "low";
    case "Moderate Maturity":
      return "moderate";
    case "High Maturity":
      return "high";
  }
}

export function dataMaturityTierClass(tier: DataMaturityTier): string {
  return `data-maturity-tier data-maturity-tier--${dataMaturityTierSlug(tier)}`;
}

export function dataMaturityTierShortLabel(tier: DataMaturityTier): string {
  switch (tier) {
    case "Low Maturity":
      return "Low";
    case "Moderate Maturity":
      return "Moderate";
    case "High Maturity":
      return "High";
  }
}
