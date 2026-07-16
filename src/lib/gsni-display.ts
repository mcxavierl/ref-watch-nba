import type { RefProfile } from "@/lib/types";

/** Percent divergence from league that maps GSNI to 0 or 100. */
export const GSNI_EXTREME_DIVERGENCE = 0.25;

export const GSNI_HIGH_THRESHOLD = 75;
export const GSNI_LOW_THRESHOLD = 25;

export type GsniBand = "quiet" | "neutral" | "heavy";

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
  const band = gsniBand(index);
  if (band === "quiet") return "Quieter in key states";
  if (band === "heavy") return "Heavier in key states";
  return "Matches league in key states";
}

export function gsniShortLabel(index: number): string {
  const band = gsniBand(index);
  if (band === "quiet") return "State-quiet";
  if (band === "heavy") return "State-heavy";
  return "State-neutral";
}

export function gsniFromRefProfile(profile: RefProfile): number | null {
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
