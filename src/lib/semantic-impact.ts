/** Semantic positive / negative / neutral tone for betting-impact metrics. */

export type SemanticImpactTone = "positive" | "negative" | "neutral";

export const SEMANTIC_IMPACT_NEUTRAL_DELTA = 0.5;
export const SEMANTIC_IMPACT_MIN_SAMPLE_GAMES = 10;

export const SEMANTIC_IMPACT_TEXT_CLASS: Record<SemanticImpactTone, string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-slate-400",
};

export const SEMANTIC_IMPACT_PILL_CLASS: Record<SemanticImpactTone, string> = {
  positive:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  negative: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  neutral: "bg-slate-800/40 text-slate-400 border border-slate-700/40",
};

export type SemanticImpactOptions = {
  /** Absolute delta below this stays neutral (default 0.5). */
  minAbsDelta?: number;
  /** When set and below minSampleGames, tone is neutral. */
  sampleGames?: number;
  minSampleGames?: number;
};

export function semanticImpactTone(
  delta: number,
  options: SemanticImpactOptions = {},
): SemanticImpactTone {
  const minAbsDelta = options.minAbsDelta ?? SEMANTIC_IMPACT_NEUTRAL_DELTA;
  const minSample = options.minSampleGames ?? SEMANTIC_IMPACT_MIN_SAMPLE_GAMES;

  if (
    options.sampleGames !== undefined &&
    options.sampleGames < minSample
  ) {
    return "neutral";
  }

  if (!Number.isFinite(delta) || Math.abs(delta) < minAbsDelta) {
    return "neutral";
  }

  return delta > 0 ? "positive" : "negative";
}

export function semanticImpactTextClass(
  delta: number,
  options?: SemanticImpactOptions,
): string {
  return SEMANTIC_IMPACT_TEXT_CLASS[semanticImpactTone(delta, options)];
}

export function semanticImpactPillClass(
  delta: number,
  options?: SemanticImpactOptions,
): string {
  return SEMANTIC_IMPACT_PILL_CLASS[semanticImpactTone(delta, options)];
}

/** Win rate (0-100) vs a baseline; uses 2pp band before coloring. */
export function semanticWinRateTone(
  ratePct: number,
  baselinePct: number,
  options?: SemanticImpactOptions,
): SemanticImpactTone {
  return semanticImpactTone(ratePct - baselinePct, {
    ...options,
    minAbsDelta: options?.minAbsDelta ?? 2,
  });
}
