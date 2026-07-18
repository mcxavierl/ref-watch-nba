import { shrinkGsni, shrunkMetricTooltip, type ShrunkMetric } from "@/lib/bayesian-shrinkage";
import { gsniDeltaFromNeutral } from "@/lib/gsni-ui";
import type { RefProfile } from "@/lib/types";

/** Percent divergence from league that maps GSNI to 0 or 100. */
export const GSNI_EXTREME_DIVERGENCE = 0.25;

export const GSNI_HIGH_THRESHOLD = 75;
export const GSNI_LOW_THRESHOLD = 25;

export type GsniBand = "quiet" | "neutral" | "heavy";

export type GsniExplanation = {
  band: GsniBand;
  bandTitle: string;
  vsLeaguePoints: number;
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

/** Plain-language breakdown of how the index maps to Quiet / Heavy labels. */
export function explainGsni(index: number): GsniExplanation {
  const band = gsniBand(index);
  const bandTitle = gsniBandTitle(band);
  const vsLeaguePoints = gsniDeltaFromNeutral(index);
  const tendency =
    vsLeaguePoints >= 3
      ? "quieter"
      : vsLeaguePoints <= -3
        ? "heavier"
        : "league-average";

  const headline =
    band === "quiet"
      ? "Quiet in clutch states"
      : band === "heavy"
        ? "Heavy in clutch states"
        : "League-average in clutch states";

  const comparisonLine =
    tendency === "league-average"
      ? "Matches the league flag rate in close, late-clock situations (50 baseline)."
      : `${Math.abs(vsLeaguePoints)} pts ${tendency} than league on the GSNI scale (50 = league avg).`;

  const methodLine =
    "We bucket each game by score gap and clock, weight late close-game minutes higher, " +
    "then compare this official's flag rate in those buckets to the league average.";

  const scaleLine =
    "Scale: 0 = heaviest vs league, 50 = league average, 100 = quietest vs league.";

  return {
    band,
    bandTitle,
    vsLeaguePoints,
    tendency,
    headline,
    comparisonLine,
    methodLine,
    scaleLine,
  };
}

export function gsniBand(index: number): GsniBand {
  if (index >= GSNI_HIGH_THRESHOLD) return "quiet";
  if (index <= GSNI_LOW_THRESHOLD) return "heavy";
  return "neutral";
}

export function isExtremeGsni(index: number): boolean {
  return index >= GSNI_HIGH_THRESHOLD || index <= GSNI_LOW_THRESHOLD;
}

export function formatGsni(index: number): string {
  return String(Math.round(index));
}

export function gsniCaption(index: number): string {
  return explainGsni(index).headline;
}

export function gsniShortLabel(index: number): string {
  const band = gsniBand(index);
  if (band === "quiet") return "Quiet";
  if (band === "heavy") return "Heavy";
  return "Neutral";
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
    tooltip: shrunkMetricTooltip(shrinkage, { label: "GSNI", unit: "GSNI" }),
  };
}

/** Shrunk GSNI for UI display; null when the profile has no observed score. */
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
