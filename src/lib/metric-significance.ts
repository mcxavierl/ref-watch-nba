import { REF_TEAM_SPLIT_MIN_GAMES } from "@/config/methodology";

/**
 * Neutral-first metric highlighting: color only when a value clears ~1σ from baseline.
 *
 * When population std dev is unavailable we use league-tuned proxy thresholds:
 * - Win-rate pp deltas: 12pp (matrix split display; 15pp for outlier filtering)
 * - Rate % vs baseline: 8pp band around 50% neutral line
 * - Whistle % vs league: 10% (aligned with FOUL_RATE_VARIANCE_PCT)
 * - Signed absolutes (pts/fouls): 2.0 below standout; 12.0 for standout glow
 */

/** Minimum win-rate pp delta to qualify as an outlier candidate. */
export const WIN_RATE_OUTLIER_PP = 15;

/** Win-rate pp delta at or above ~1 league std dev for hero/card highlight. */
export const WIN_RATE_SIGNIFICANT_PP = 12;

/** Whistle/foul rate % delta vs league mean for hero highlight. */
export const WHISTLE_SIGNIFICANT_PCT = 10;

/** Generic % rate delta vs a baseline for delight coloring. */
export const RATE_SIGNIFICANT_PCT = 8;

/** Signed absolute delta (pts, fouls) when std dev is unknown. */
export const DELTA_SIGNIFICANT_ABS = 5;

/** Smaller delta label threshold inside finding stat grids. */
export const FINDING_DELTA_SIGNIFICANT_ABS = 2;

/** Larger signed deltas earn standout glow. */
export const DELTA_STANDOUT_ABS = 12;

export type SignificantTone = "positive" | "negative" | "neutral";

export type TwoProportionZTestResult = {
  z: number;
  pValue: number;
  significantAt05: boolean;
};

/** Standard normal CDF approximation (Abramowitz & Stegun 26.2.17). */
function standardNormalCdf(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const poly =
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

function twoTailedPValue(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(0, Math.min(1, 2 * (1 - standardNormalCdf(Math.abs(z)))));
}

/**
 * Two-tailed two-proportion z-test: does group A differ from group B?
 * Returns not significant when either n is 0, pooled variance is 0,
 * or nA is below the published ref-team sample gate.
 */
export function twoProportionZTest(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number,
): TwoProportionZTestResult {
  const invalid =
    !Number.isFinite(successesA) ||
    !Number.isFinite(nA) ||
    !Number.isFinite(successesB) ||
    !Number.isFinite(nB) ||
    nA <= 0 ||
    nB <= 0 ||
    nA < REF_TEAM_SPLIT_MIN_GAMES ||
    successesA < 0 ||
    successesB < 0 ||
    successesA > nA ||
    successesB > nB;

  if (invalid) {
    return { z: 0, pValue: 1, significantAt05: false };
  }

  const pA = successesA / nA;
  const pB = successesB / nB;
  const pooledSuccesses = successesA + successesB;
  const pooledN = nA + nB;
  const pooledRate = pooledSuccesses / pooledN;
  const pooledVariance = pooledRate * (1 - pooledRate);

  if (pooledVariance <= 0) {
    return { z: 0, pValue: 1, significantAt05: false };
  }

  const standardError = Math.sqrt(pooledVariance * (1 / nA + 1 / nB));
  if (standardError <= 0) {
    return { z: 0, pValue: 1, significantAt05: false };
  }

  const z = (pA - pB) / standardError;
  const pValue = twoTailedPValue(z);
  return {
    z,
    pValue,
    significantAt05: pValue < 0.05,
  };
}

/** True when |value - mean| >= 1 population standard deviation. */
export function isSignificantDeviation(
  value: number,
  mean: number,
  stdDev: number,
): boolean {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(mean) ||
    !Number.isFinite(stdDev) ||
    stdDev <= 0
  ) {
    return false;
  }
  return Math.abs(value - mean) >= stdDev;
}

export function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function significantSignedTone(
  delta: number,
  threshold: number,
): SignificantTone {
  if (delta >= threshold) return "positive";
  if (delta <= -threshold) return "negative";
  return "neutral";
}

export function heroToneFromWinRateDelta(deltaPts: number): SignificantTone {
  return significantSignedTone(deltaPts, WIN_RATE_SIGNIFICANT_PP);
}

export function heroToneFromWhistlePct(pctVsLeague: number): SignificantTone {
  return significantSignedTone(pctVsLeague, WHISTLE_SIGNIFICANT_PCT);
}

export function overRateHeroTone(
  overRate: number,
  mean: number,
  stdDev: number,
): SignificantTone {
  if (!isSignificantDeviation(overRate, mean, stdDev)) return "neutral";
  return overRate > mean ? "positive" : "negative";
}

function parseSignedNumber(value: string): number | null {
  const match = value.match(/^([+-]?\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function isNearZeroSigned(value: string): boolean {
  return /^[+-]0(?:\.0+)?(?:\s|$|%|pp)/.test(value.trim());
}

/** Infer KPI pill tone from a formatted value; neutral unless magnitude clears proxy σ. */
export function inferSignificantKpiTone(value: string): SignificantTone {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("+") || trimmed.startsWith("-")) &&
    !isNearZeroSigned(trimmed)
  ) {
    const num = parseSignedNumber(trimmed);
    if (num == null) return "neutral";

    const abs = Math.abs(num);
    const isPct = trimmed.includes("%");
    const isPp = trimmed.includes("pp");

    if (isPp) {
      return significantSignedTone(num, WIN_RATE_SIGNIFICANT_PP);
    }
    if (isPct) {
      return significantSignedTone(num, RATE_SIGNIFICANT_PCT);
    }
    if (abs >= DELTA_STANDOUT_ABS || abs >= DELTA_SIGNIFICANT_ABS) {
      return num > 0 ? "positive" : "negative";
    }
    return "neutral";
  }
  return "neutral";
}

export type MetricHighlightTone =
  | "positive"
  | "negative"
  | "neutral"
  | "standout-high"
  | "standout-low";

/** Delight tone for raw stat strings; highlight only on statistically meaningful deltas. */
export function statValueSignificanceTone(value: string): MetricHighlightTone {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("+") || trimmed.startsWith("-")) &&
    !isNearZeroSigned(trimmed)
  ) {
    const num = parseSignedNumber(trimmed);
    if (num == null) return "neutral";

    const abs = Math.abs(num);
    const isPct = trimmed.includes("%");
    const isPp = trimmed.includes("pp");

    if (isPp) {
      if (abs >= DELTA_STANDOUT_ABS) {
        return num > 0 ? "standout-high" : "standout-low";
      }
      if (abs >= WIN_RATE_SIGNIFICANT_PP) {
        return num > 0 ? "positive" : "negative";
      }
      return "neutral";
    }

    if (isPct) {
      if (abs >= DELTA_STANDOUT_ABS) {
        return num > 0 ? "standout-high" : "standout-low";
      }
      if (abs >= RATE_SIGNIFICANT_PCT) {
        return num > 0 ? "positive" : "negative";
      }
      return "neutral";
    }

    if (abs >= DELTA_STANDOUT_ABS) {
      return num > 0 ? "standout-high" : "standout-low";
    }
    if (abs >= DELTA_SIGNIFICANT_ABS) {
      return num > 0 ? "positive" : "negative";
    }
    return "neutral";
  }
  return "neutral";
}
