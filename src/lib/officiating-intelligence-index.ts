import { dataMaturityPercent } from "@/lib/data-maturity";
import type { RefGameRecord, RefProfile, RefStatsFile } from "@/lib/types";

/**
 * Production outlier audit (2026-07): 655 refs with OII; 0 scored >= 90 live.
 * High 80s were NHL/NFL/CFB artifacts: volatility pinned at 100 when a single
 * penalty outlier (e.g. 126 PIM) hit the 10-game window while leverage defaulted
 * to 50 without PBP. Calibration below winsorizes whistle spikes and uses a
 * stronger OII-specific Bayesian prior before scores are cached.
 */
export const OII_BAYESIAN_PRIOR_STRENGTH = 30;

/** Minimum career games before OII is published. */
export const OII_MIN_SAMPLE = 10;

/** Rolling window for foul/card volatility. */
export const OII_ROLLING_WINDOW = 10;

/** Rolling comparison window for hub "OII movers" spotlight. */
export const OII_MOVERS_WINDOW_DAYS = 7;

/** Cap single-game whistle spikes relative to league average in volatility window. */
export const OII_VOLATILITY_WINSOR_CAP_MULT = 1.75;

/** Maps relative foul/card std-dev to 0-100 volatility subscore. */
export const OII_VOLATILITY_SCALE = 130;

export const OII_WEIGHTS = {
  volatility: 0.4,
  highLeverage: 0.3,
  sampleConfidence: 0.3,
} as const;

export const OII_INSUFFICIENT_LABEL = "N/A - Insufficient Data";

export type OiiMatchInput = {
  recentGames: readonly RefGameRecord[];
  leagueAvgFouls?: number;
  /** Career or scoped sample size (games officiated). */
  sampleSize: number;
};

export type OiiComponents = {
  volatilityScore: number;
  highLeverageScore: number;
  sampleConfidenceScore: number;
};

export type OiiGenerationResult =
  | {
      status: "insufficient";
      refereeId: string;
      sampleSize: number;
      displayLabel: typeof OII_INSUFFICIENT_LABEL;
    }
  | {
      status: "ok";
      refereeId: string;
      score: number;
      sampleSize: number;
      components: OiiComponents;
      weights: typeof OII_WEIGHTS;
    };

export function oiiMethodologyTooltip(
  components?: OiiComponents,
  weights: typeof OII_WEIGHTS = OII_WEIGHTS,
): string {
  const weightLines = [
    `${Math.round(weights.volatility * 100)}% foul/card volatility (${OII_ROLLING_WINDOW}-game rolling std-dev)`,
    `${Math.round(weights.highLeverage * 100)}% high-leverage share in close games when tracked`,
    `${Math.round(weights.sampleConfidence * 100)}% sample confidence (Bayesian maturity)`,
  ].join(". ");
  const preamble =
    "OII is a proprietary model used to track officiating predictability. " +
    "It is not an absolute measure of quality, but a gauge of statistical deviation under pressure. " +
    `Weighting: ${weightLines}.`;
  if (!components) {
    return preamble;
  }
  return (
    `${preamble} ` +
    `This read: volatility ${Math.round(components.volatilityScore)}, ` +
    `high-leverage ${Math.round(components.highLeverageScore)}, ` +
    `confidence ${Math.round(components.sampleConfidenceScore)}.`
  );
}

function clampScore(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

function whistleMetric(game: RefGameRecord): number | null {
  if (Number.isFinite(game.totalFouls) && game.totalFouls >= 0) {
    return game.totalFouls;
  }
  const minors =
    (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  if (minors > 0) return minors;
  const flags = (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  if (flags > 0) return flags;
  return null;
}

function winsorizeWhistleWindow(
  values: number[],
  leagueAvgFouls?: number,
): number[] {
  if (!leagueAvgFouls || leagueAvgFouls <= 0) return values;
  const cap = leagueAvgFouls * OII_VOLATILITY_WINSOR_CAP_MULT;
  return values.map((value) => Math.min(value, cap));
}

/** Std-dev distance from rolling mean mapped to 0-100. */
export function computeOiiVolatilityScore(
  recentGames: readonly RefGameRecord[],
  leagueAvgFouls?: number,
): number {
  const window = recentGames
    .slice(0, OII_ROLLING_WINDOW)
    .map(whistleMetric)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (window.length < 3) return 50;

  const capped = winsorizeWhistleWindow(window, leagueAvgFouls);
  const mean = capped.reduce((s, v) => s + v, 0) / capped.length;
  const variance =
    capped.reduce((s, v) => s + (v - mean) ** 2, 0) / capped.length;
  const stdDev = Math.sqrt(variance);
  const baseline = leagueAvgFouls && leagueAvgFouls > 0 ? leagueAvgFouls : mean;
  const relativeVol = baseline > 0 ? stdDev / baseline : 0;
  return clampScore(relativeVol * OII_VOLATILITY_SCALE);
}

/** High-leverage multiplier from PBP-backed rates or neutral when unavailable. */
export function computeOiiHighLeverageScore(
  recentGames: readonly RefGameRecord[],
): number {
  const leverageRates = recentGames
    .map((g) => g.highLeverageFlagRate)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  if (leverageRates.length > 0) {
    const avg = leverageRates.reduce((s, v) => s + v, 0) / leverageRates.length;
    return clampScore(avg * 100);
  }

  const impacts = recentGames
    .map((g) => g.highLeverageImpact)
    .filter((v): v is number => v !== undefined && Number.isFinite(v) && v >= 0);

  if (impacts.length > 0) {
    const avg = impacts.reduce((s, v) => s + v, 0) / impacts.length;
    return clampScore(Math.min(100, avg * 12));
  }

  return 50;
}

/** Bayesian sample confidence mapped to 0-100. */
export function computeOiiSampleConfidenceScore(
  sampleSize: number,
  priorStrength = OII_BAYESIAN_PRIOR_STRENGTH,
): number {
  if (!Number.isFinite(sampleSize) || sampleSize <= 0) return 0;
  const bayesianWeight = sampleSize / (sampleSize + priorStrength);
  const maturity = dataMaturityPercent(sampleSize) / 100;
  return clampScore((bayesianWeight * 0.6 + maturity * 0.4) * 100);
}

/** Fingerprint ref inputs that affect cached OII for incremental enrichment. */
export function refOiiEnrichFingerprint(ref: RefProfile): string {
  const recent = ref.recentGames.slice(0, OII_ROLLING_WINDOW);
  const tail = recent
    .map((game) => {
      const whistle = whistleMetric(game);
      return `${game.gameId}|${game.date}|${whistle ?? ""}`;
    })
    .join(";");
  return `${ref.games}:${tail}`;
}

export function computeOiiComponents(matchData: OiiMatchInput): OiiComponents {
  return {
    volatilityScore: computeOiiVolatilityScore(
      matchData.recentGames,
      matchData.leagueAvgFouls,
    ),
    highLeverageScore: computeOiiHighLeverageScore(matchData.recentGames),
    sampleConfidenceScore: computeOiiSampleConfidenceScore(matchData.sampleSize),
  };
}

export function scoreFromOiiComponents(components: OiiComponents): number {
  return clampScore(
    components.volatilityScore * OII_WEIGHTS.volatility +
      components.highLeverageScore * OII_WEIGHTS.highLeverage +
      components.sampleConfidenceScore * OII_WEIGHTS.sampleConfidence,
  );
}

/**
 * Proprietary Officiating Intelligence Index (OII) for a referee.
 * Returns N/A when sample size is below the maturity gate.
 */
export function generateOII(
  refereeId: string,
  matchData: OiiMatchInput,
): OiiGenerationResult {
  if (!Number.isFinite(matchData.sampleSize) || matchData.sampleSize < OII_MIN_SAMPLE) {
    return {
      status: "insufficient",
      refereeId,
      sampleSize: matchData.sampleSize ?? 0,
      displayLabel: OII_INSUFFICIENT_LABEL,
    };
  }

  const components = computeOiiComponents(matchData);
  return {
    status: "ok",
    refereeId,
    score: scoreFromOiiComponents(components),
    sampleSize: matchData.sampleSize,
    components,
    weights: OII_WEIGHTS,
  };
}

export function generateOiiFromRefProfile(
  profile: RefProfile,
  leagueAvgFouls?: number,
): OiiGenerationResult {
  return generateOII(profile.slug, {
    recentGames: profile.recentGames,
    leagueAvgFouls,
    sampleSize: profile.games,
  });
}

/** Prefer cached score for hub/dashboard; full generate for profile drill-down. */
export function resolveOiiForRef(
  profile: RefProfile,
  options?: { leagueAvgFouls?: number; preferCache?: boolean },
): OiiGenerationResult {
  const generated = generateOiiFromRefProfile(profile, options?.leagueAvgFouls);
  if (
    generated.status === "ok" &&
    options?.preferCache &&
    profile.cached_oii_score != null &&
    Number.isFinite(profile.cached_oii_score)
  ) {
    return { ...generated, score: clampScore(profile.cached_oii_score) };
  }
  return generated;
}

export function enrichRefStatsWithCachedOii(stats: RefStatsFile): number {
  const leagueAvg = stats.meta.leagueAvgFouls;
  let updated = 0;
  for (const ref of stats.refs) {
    const result = generateOII(ref.slug, {
      recentGames: ref.recentGames,
      leagueAvgFouls: leagueAvg,
      sampleSize: ref.games,
    });
    const next =
      result.status === "ok" ? result.score : null;
    if (ref.cached_oii_score !== next) {
      ref.cached_oii_score = next;
      updated++;
    }
  }
  return updated;
}
