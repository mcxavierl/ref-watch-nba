/** Shared GSNI UI helpers for deltas, tones, and sample formatting. */

export const GSNI_NEUTRAL_BASELINE = 50;

export function gsniDeltaFromNeutral(gsni: number): number {
  return Math.round((gsni - GSNI_NEUTRAL_BASELINE) * 10) / 10;
}

export type GsniDeltaTone = "positive" | "negative" | "neutral";

export function gsniDeltaTone(delta: number): GsniDeltaTone {
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

export function gsniDeltaArrow(delta: number): string {
  if (delta > 0) return "▲";
  if (delta < 0) return "▼";
  return "•";
}

export function formatGsniDelta(delta: number): string {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : String(delta);
}
