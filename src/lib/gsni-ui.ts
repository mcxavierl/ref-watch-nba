/** Shared GSNI UI helpers for Z-score display, tones, and sample formatting. */

import {
  GSNI_Z_EXTREME_THRESHOLD,
  GSNI_Z_NEUTRAL_THRESHOLD,
  GSNI_Z_TRACK_SPAN,
} from "@/lib/gsni";

/** League mean on the GSNI Z-scale (0σ). */
export const GSNI_NEUTRAL_BASELINE = 0;

/** Half-width of the shared Z-track visualization in σ units. */
export const GSNI_Z_TRACK_MAX = GSNI_Z_TRACK_SPAN;

export function formatGsniZ(z: number): string {
  const rounded = Math.round(z * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toFixed(1)}σ`;
}

/** Z-score relative to league mean (same as input on the Z-scale). */
export function gsniDeltaFromNeutral(z: number): number {
  return Math.round(z * 10) / 10;
}

export type GsniDeltaTone = "positive" | "negative" | "neutral";

export function gsniDeltaTone(delta: number): GsniDeltaTone {
  if (delta >= GSNI_Z_NEUTRAL_THRESHOLD) return "positive";
  if (delta <= -GSNI_Z_NEUTRAL_THRESHOLD) return "negative";
  return "neutral";
}

export function gsniDeltaArrow(delta: number): string {
  if (delta >= GSNI_Z_NEUTRAL_THRESHOLD) return "▲";
  if (delta <= -GSNI_Z_NEUTRAL_THRESHOLD) return "▼";
  return "•";
}

export function formatGsniDelta(delta: number): string {
  return formatGsniZ(delta);
}

export { GSNI_Z_NEUTRAL_THRESHOLD, GSNI_Z_EXTREME_THRESHOLD };
