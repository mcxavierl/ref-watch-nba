import { shrinkGsni, type ShrunkMetric } from "@/lib/bayesian-shrinkage";
import {
  GSNI_Z_EXTREME_THRESHOLD,
  GSNI_Z_NEUTRAL_THRESHOLD,
} from "@/lib/gsni";
import {
  formatGsniIndexScore,
  formatGsniScoreValue,
  formatGsniZ,
  GSNI_INSUFFICIENT_DATA_LABEL,
  GSNI_SCALE_LEGEND,
} from "@/lib/gsni-ui";
import type { RefProfile } from "@/lib/types";

export { GSNI_INSUFFICIENT_DATA_LABEL, GSNI_SCALE_LEGEND };

export type GsniBand = "quiet" | "neutral" | "heavy";

export type GsniQualitativeLabel =
  | "Typical Frequency"
  | "Below-Average Frequency"
  | "Above-Average Frequency"
  | "Well Below-Average Frequency"
  | "Well Above-Average Frequency";

export type GsniCategory = "elevated" | "neutral" | "suppressed";

export type GsniExplanation = {
  band: GsniBand;
  bandTitle: string;
  qualitativeLabel: GsniQualitativeLabel;
  category: GsniCategory;
  categoryLabel: "Elevated" | "Neutral" | "Suppressed";
  zScore: number;
  tendency: "below-average" | "above-average" | "typical";
  headline: string;
  insightSummary: string;
  comparisonLine: string;
  methodLine: string;
  scaleLine: string;
};

export function gsniBandTitle(band: GsniBand): string {
  switch (band) {
    case "quiet":
      return "Below-Average Frequency";
    case "heavy":
      return "Above-Average Frequency";
    default:
      return "Typical Frequency";
  }
}

/** Map an index score to a plain-language frequency label. */
export function gsniQualitativeLabel(z: number): GsniQualitativeLabel {
  const absZ = Math.abs(z);
  if (absZ < GSNI_Z_NEUTRAL_THRESHOLD) return "Typical Frequency";
  if (absZ >= GSNI_Z_EXTREME_THRESHOLD) {
    return z > 0 ? "Well Below-Average Frequency" : "Well Above-Average Frequency";
  }
  return z > 0 ? "Below-Average Frequency" : "Above-Average Frequency";
}

/** Category pill label aligned with Insights page vocabulary. */
export function gsniCategoryLabel(
  z: number,
): "Elevated" | "Neutral" | "Suppressed" {
  const absZ = Math.abs(z);
  if (absZ < GSNI_Z_NEUTRAL_THRESHOLD) return "Neutral";
  return z > 0 ? "Suppressed" : "Elevated";
}

export function gsniCategory(z: number): GsniCategory {
  const label = gsniCategoryLabel(z);
  if (label === "Neutral") return "neutral";
  return label === "Elevated" ? "elevated" : "suppressed";
}

/** One-line insight for cards and hero highlights. */
export function gsniInsightSummary(zScore: number): string {
  const value = formatGsniScoreValue(zScore);
  const category = gsniCategoryLabel(zScore);
  const absZ = Math.abs(zScore);

  if (category === "Neutral") {
    return `${value}: Typical penalty frequency in high-leverage states.`;
  }

  if (category === "Elevated") {
    return absZ >= GSNI_Z_EXTREME_THRESHOLD
      ? `${value}: Significantly elevated penalty frequency in high-leverage states.`
      : `${value}: Slightly elevated penalty frequency in high-leverage states.`;
  }

  return absZ >= GSNI_Z_EXTREME_THRESHOLD
    ? `${value}: Significant whistle-suppression in high-leverage states.`
    : `${value}: Slightly suppressed penalty frequency in high-leverage states.`;
}

/** @deprecated Prefer gsniCategoryLabel for pill text. */
export function gsniBandCompactLabel(z: number): string {
  return gsniCategoryLabel(z);
}

function historicalTendencyHeadline(
  qualitativeLabel: GsniQualitativeLabel,
): string {
  switch (qualitativeLabel) {
    case "Well Below-Average Frequency":
      return "Strong historical tendency toward lower-than-average penalty frequency in high-leverage situations";
    case "Well Above-Average Frequency":
      return "Strong historical tendency toward higher-than-average penalty frequency in high-leverage situations";
    case "Below-Average Frequency":
      return "Historical tendency toward lower-than-average penalty frequency in high-leverage situations";
    case "Above-Average Frequency":
      return "Historical tendency toward higher-than-average penalty frequency in high-leverage situations";
    default:
      return "Historical tendency near league-average penalty frequency in high-leverage situations";
  }
}

/** Plain-language breakdown of how the index score maps to frequency labels. */
export function explainGsni(zScore: number): GsniExplanation {
  const band = gsniBand(zScore);
  const qualitativeLabel = gsniQualitativeLabel(zScore);
  const bandTitle = gsniBandTitle(band);
  const tendency =
    zScore >= GSNI_Z_NEUTRAL_THRESHOLD
      ? "below-average"
      : zScore <= -GSNI_Z_NEUTRAL_THRESHOLD
        ? "above-average"
        : "typical";

  const headline = historicalTendencyHeadline(qualitativeLabel);
  const category = gsniCategory(zScore);
  const categoryLabel = gsniCategoryLabel(zScore);
  const insightSummary = gsniInsightSummary(zScore);

  const comparisonLine = insightSummary;

  const methodLine =
    "We group each game by score gap and clock, weight close late-game minutes higher, " +
    "then compare this official's penalty frequency in those situations to the league average.";

  const scaleLine = GSNI_SCALE_LEGEND;

  return {
    band,
    bandTitle,
    qualitativeLabel,
    category,
    categoryLabel,
    zScore,
    tendency,
    headline,
    insightSummary,
    comparisonLine,
    methodLine,
    scaleLine,
  };
}

export function gsniBand(zScore: number): GsniBand {
  if (zScore >= GSNI_Z_NEUTRAL_THRESHOLD) return "quiet";
  if (zScore <= -GSNI_Z_NEUTRAL_THRESHOLD) return "heavy";
  return "neutral";
}

export function isExtremeGsni(zScore: number): boolean {
  return Math.abs(zScore) >= GSNI_Z_EXTREME_THRESHOLD;
}

/** @deprecated Use formatGsniIndexScore from gsni-ui. Kept for internal track aria labels. */
export function formatGsni(zScore: number): string {
  return formatGsniZ(zScore);
}

export function gsniCaption(zScore: number): string {
  return gsniInsightSummary(zScore);
}

export function gsniShortLabel(zScore: number): string {
  return gsniQualitativeLabel(zScore);
}

export type GsniProfileDisplay = {
  display: number;
  observed: number;
  shrinkage: ShrunkMetric;
  tooltip: string;
};

function gsniShrinkageTooltipText(metric: ShrunkMetric): string {
  return [
    `Game-State Index: ${formatGsniIndexScore(metric.shrunk)} (adjusted estimate).`,
    `Observed index score: ${formatGsniIndexScore(metric.observed)}.`,
    `League average baseline: ${formatGsniIndexScore(metric.prior)}.`,
    `Sample weight ${metric.lambda.toFixed(2)} from ${metric.sampleN} high-leverage minutes.`,
  ].join(" ");
}

export function gsniShrinkageFromProfile(
  profile: Pick<RefProfile, "referee_gsni" | "gsniHighLeverageMinutes">,
): GsniProfileDisplay | null {
  if (profile.referee_gsni === undefined || profile.referee_gsni === null) {
    return null;
  }
  const hlMinutes = profile.gsniHighLeverageMinutes ?? 0;
  const shrinkage = shrinkGsni(profile.referee_gsni, hlMinutes);
  return {
    display: shrinkage.shrunk,
    observed: shrinkage.observed,
    shrinkage,
    tooltip: gsniShrinkageTooltipText(shrinkage),
  };
}

/** Shrunk Game-State Index score for UI display; null when the profile has no observed score. */
export function gsniFromRefProfile(profile: RefProfile): number | null {
  return gsniShrinkageFromProfile(profile)?.display ?? null;
}

export function gsniObservedFromRefProfile(profile: RefProfile): number | null {
  if (profile.referee_gsni === undefined || profile.referee_gsni === null) {
    return null;
  }
  return profile.referee_gsni;
}

export function gsniSampleLabel(profile: RefProfile): string | null {
  if (profile.gsniHighLeverageMinutes === undefined) return null;
  const games = profile.gsniSampleGames ?? 0;
  return `${profile.gsniHighLeverageMinutes.toFixed(0)} high-leverage minutes across ${games} games`;
}
