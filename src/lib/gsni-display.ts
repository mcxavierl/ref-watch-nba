import { shrinkGsni, type ShrunkMetric } from "@/lib/bayesian-shrinkage";
import {
  GSNI_Z_EXTREME_THRESHOLD,
  GSNI_Z_NEUTRAL_THRESHOLD,
} from "@/lib/gsni";
import {
  formatGsniIndexScore,
  formatGsniZ,
  GSNI_INSUFFICIENT_DATA_LABEL,
} from "@/lib/gsni-ui";
import type { RefProfile } from "@/lib/types";

export { GSNI_INSUFFICIENT_DATA_LABEL };

export type GsniBand = "quiet" | "neutral" | "heavy";

export type GsniQualitativeLabel =
  | "Typical Frequency"
  | "Below-Average Frequency"
  | "Above-Average Frequency"
  | "Well Below-Average Frequency"
  | "Well Above-Average Frequency";

export type GsniExplanation = {
  band: GsniBand;
  bandTitle: string;
  qualitativeLabel: GsniQualitativeLabel;
  zScore: number;
  tendency: "below-average" | "above-average" | "typical";
  headline: string;
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
  const indexScore = formatGsniIndexScore(zScore);

  const comparisonLine =
    tendency === "typical"
      ? `${indexScore}. This official's penalty frequency in high-leverage situations has been close to the league average.`
      : tendency === "below-average"
        ? `${indexScore}. This official shows a historical tendency for lower-than-average penalty frequency in high-leverage situations.`
        : `${indexScore}. This official shows a historical tendency for higher-than-average penalty frequency in high-leverage situations.`;

  const methodLine =
    "We group each game by score gap and clock, weight close late-game minutes higher, " +
    "then compare this official's penalty frequency in those situations to the league average.";

  const scaleLine =
    "Index Score compares this official to the league average in matched high-leverage situations. " +
    "Positive scores indicate below-average penalty frequency; negative scores indicate above-average frequency; " +
    "scores near zero indicate typical frequency.";

  return {
    band,
    bandTitle,
    qualitativeLabel,
    zScore,
    tendency,
    headline,
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
  return explainGsni(zScore).headline;
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
