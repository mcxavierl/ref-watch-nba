/**
 * Empirical-Bayes shrinkage toward league priors for low-N GSNI and penalty metrics.
 *
 * shrunk = prior + λ × (observed − prior), where λ = N / (N + k).
 */

import { GSNI_MIN_HIGH_LEVERAGE_MINUTES } from "@/lib/gsni";
import { formatSigned } from "@/lib/stats-utils";

/** Pseudo high-leverage minutes backing the league prior (matches GSNI gate). */
export const GSNI_SHRINKAGE_PRIOR_HL_MINUTES = GSNI_MIN_HIGH_LEVERAGE_MINUTES;

/** Neutral GSNI index (league mean in matched clutch states). */
export const GSNI_LEAGUE_PRIOR = 50;

/** Prior strength for penalty deltas and leverage-weighted rates (HL-minute scale). */
export const PENALTY_SHRINKAGE_PRIOR_HL_MINUTES = GSNI_MIN_HIGH_LEVERAGE_MINUTES;

export type ShrunkMetric = {
  observed: number;
  shrunk: number;
  prior: number;
  lambda: number;
  sampleN: number;
};

export function bayesianShrinkLambda(
  sampleN: number,
  priorStrength: number,
): number {
  if (!Number.isFinite(sampleN) || sampleN <= 0) return 0;
  if (!Number.isFinite(priorStrength) || priorStrength <= 0) return 1;
  return sampleN / (sampleN + priorStrength);
}

/** Conjugate-style shrinkage: pull observed toward the league prior as N grows. */
export function bayesianShrinkTowardPrior(
  observed: number,
  prior: number,
  sampleN: number,
  priorStrength: number,
): ShrunkMetric {
  const lambda = bayesianShrinkLambda(sampleN, priorStrength);
  const shrunk = prior + lambda * (observed - prior);
  return {
    observed,
    shrunk: roundMetric(shrunk),
    prior,
    lambda: roundMetric(lambda, 3),
    sampleN,
  };
}

export function shrinkGsni(
  observedGsni: number,
  highLeverageMinutes: number,
): ShrunkMetric {
  return bayesianShrinkTowardPrior(
    observedGsni,
    GSNI_LEAGUE_PRIOR,
    highLeverageMinutes,
    GSNI_SHRINKAGE_PRIOR_HL_MINUTES,
  );
}

export function shrinkPenaltyDelta(
  observedDelta: number,
  sampleN: number,
  prior = 0,
  priorStrength = PENALTY_SHRINKAGE_PRIOR_HL_MINUTES,
): ShrunkMetric {
  return bayesianShrinkTowardPrior(
    observedDelta,
    prior,
    sampleN,
    priorStrength,
  );
}

export function shrinkRateTowardLeagueMean(
  observedRate: number,
  leagueMean: number,
  sampleN: number,
  priorStrength = PENALTY_SHRINKAGE_PRIOR_HL_MINUTES,
): ShrunkMetric {
  return bayesianShrinkTowardPrior(
    observedRate,
    leagueMean,
    sampleN,
    priorStrength,
  );
}

export function isShrinkageMaterial(metric: ShrunkMetric, epsilon = 0.05): boolean {
  return Math.abs(metric.shrunk - metric.observed) > epsilon;
}

/** Prefer tracked high-leverage minutes; fall back to game count for penalty metrics. */
export function shrinkageSampleN(
  highLeverageMinutes: number | undefined,
  fallbackGames: number,
): number {
  if (highLeverageMinutes !== undefined && highLeverageMinutes > 0) {
    return highLeverageMinutes;
  }
  return Math.max(0, fallbackGames);
}

export function shrunkMetricTooltip(
  metric: ShrunkMetric,
  {
    label,
    unit = "",
    priorLabel,
  }: {
    label: string;
    unit?: string;
    priorLabel?: string;
  },
): string {
  const observedText = formatMetricValue(metric.observed, unit);
  const shrunkText = formatMetricValue(metric.shrunk, unit);
  const priorText = formatMetricValue(metric.prior, unit);
  return [
    `${label}: ${shrunkText} (shrunk estimate).`,
    `Observed ${label.toLowerCase()}: ${observedText}.`,
    `League prior${priorLabel ? ` (${priorLabel})` : ""}: ${priorText}.`,
    `Weight λ=${metric.lambda.toFixed(2)} from N=${metric.sampleN} high-leverage minutes.`,
  ].join(" ");
}

function formatMetricValue(value: number, unit: string): string {
  const rounded = roundMetric(value);
  const suffix = unit ? ` ${unit}` : "";
  if (unit === "GSNI") return `${rounded}${suffix}`;
  return `${formatSigned(rounded)}${suffix}`;
}

function roundMetric(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
