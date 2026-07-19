import { shrinkGsni, shrunkMetricTooltip, type ShrunkMetric } from "@/lib/bayesian-shrinkage";
import {
  GSNI_Z_EXTREME_THRESHOLD,
  GSNI_Z_NEUTRAL_THRESHOLD,
} from "@/lib/gsni";
import { formatGsniZ } from "@/lib/gsni-ui";
import type { RefProfile } from "@/lib/types";

export type GsniBand = "quiet" | "neutral" | "heavy";

export type GsniQualitativeLabel =
  | "Neutral"
  | "Quiet"
  | "Heavy"
  | "Extreme Quiet"
  | "Extreme Heavy";

export type GsniExplanation = {
  band: GsniBand;
  bandTitle: string;
  qualitativeLabel: GsniQualitativeLabel;
  zScore: number;
  tendency: "quieter" | "heavier" | "league-average";
  headline: string;
  comparisonLine: string;
  methodLine: string;
  scaleLine: string;
};

export function gsniBandTitle(band: GsniBand): string {
  switch (band) {
    case "quiet":
      return "Quiet";
    case "heavy":
      return "Heavy";
    default:
      return "Neutral";
  }
}

/** Map a Z-score to a qualitative Quiet / Neutral / Heavy / Extreme label. */
export function gsniQualitativeLabel(z: number): GsniQualitativeLabel {
  const absZ = Math.abs(z);
  if (absZ < GSNI_Z_NEUTRAL_THRESHOLD) return "Neutral";
  if (absZ >= GSNI_Z_EXTREME_THRESHOLD) {
    return z > 0 ? "Extreme Quiet" : "Extreme Heavy";
  }
  return z > 0 ? "Quiet" : "Heavy";
}

/** Plain-language breakdown of how the Z-score maps to Quiet / Heavy labels. */
export function explainGsni(zScore: number): GsniExplanation {
  const band = gsniBand(zScore);
  const qualitativeLabel = gsniQualitativeLabel(zScore);
  const bandTitle = gsniBandTitle(band);
  const tendency =
    zScore >= GSNI_Z_NEUTRAL_THRESHOLD
      ? "quieter"
      : zScore <= -GSNI_Z_NEUTRAL_THRESHOLD
        ? "heavier"
        : "league-average";

  const headline =
    qualitativeLabel === "Extreme Quiet"
      ? "Extremely quiet in clutch states"
      : qualitativeLabel === "Extreme Heavy"
        ? "Extremely heavy in clutch states"
        : band === "quiet"
          ? "Quiet in clutch states"
          : band === "heavy"
            ? "Heavy in clutch states"
            : "League-average in clutch states";

  const formattedZ = formatGsniZ(zScore);
  const comparisonLine =
    tendency === "league-average"
      ? "Within half a standard deviation of the league flag rate in close, late-clock situations (0σ baseline)."
      : `${formattedZ} from league mean (${Math.abs(zScore).toFixed(1)}σ ${tendency} than average).`;

  const methodLine =
    "We bucket each game by score gap and clock, weight late close-game minutes higher, " +
    "then compare this official's flag rate in those buckets to the league average.";

  const scaleLine =
    "Scale: Z-score in standard deviations (σ) from the league mean. Positive = quieter; negative = heavier.";

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

/** @deprecated Use formatGsniZ from gsni-ui. Kept for internal track aria labels. */
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
    tooltip: shrunkMetricTooltip(shrinkage, { label: "Game-State Index", unit: "σ" }),
  };
}

/** Shrunk GSNI Z-score for UI display; null when the profile has no observed score. */
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
  return `${profile.gsniHighLeverageMinutes.toFixed(0)} high-leverage min across ${games} games`;
}
