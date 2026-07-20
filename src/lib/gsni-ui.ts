/** Shared Game-State Index UI helpers for index-score display and sample formatting. */

import {
  GSNI_Z_EXTREME_THRESHOLD,
  GSNI_Z_NEUTRAL_THRESHOLD,
  GSNI_Z_TRACK_SPAN,
} from "@/lib/gsni";

/** League mean on the Game-State Index scale. */
export const GSNI_NEUTRAL_BASELINE = 0;

/** Half-width of the shared index track visualization. */
export const GSNI_Z_TRACK_MAX = GSNI_Z_TRACK_SPAN;

export const GSNI_INSUFFICIENT_DATA_LABEL = "Insufficient Data to Rate";

/** Muted scale hint shown under the diagnostic index header. */
export const GSNI_SCALE_LEGEND =
  "(0.0 = League Avg | + Higher Frequency | - Lower Frequency)";

export function formatGsniScoreValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}`;
}

export function formatGsniIndexScore(value: number): string {
  return `Index Score: ${formatGsniScoreValue(value)}`;
}

/** @deprecated Prefer formatGsniIndexScore. Kept for internal callers. */
export function formatGsniZ(z: number): string {
  return formatGsniIndexScore(z);
}

/** Index score relative to league average. */
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
  return formatGsniIndexScore(delta);
}

export { GSNI_Z_NEUTRAL_THRESHOLD, GSNI_Z_EXTREME_THRESHOLD };
