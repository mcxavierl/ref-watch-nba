import { STATE_COLOR_CLASS } from "@/constants/colors";

/** Percent delta vs a league/baseline average for insight stat cards. */
export function variancePercent(delta: number, baseline: number): number {
  if (!Number.isFinite(delta) || !Number.isFinite(baseline) || baseline === 0) {
    return 0;
  }
  return Math.round((delta / baseline) * 1000) / 10;
}

export function formatVariancePercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded}%`;
}

export type MetricVarianceTone = "positive" | "negative" | "neutral";

export function varianceToneFromDelta(delta: number): MetricVarianceTone {
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

export const METRIC_VARIANCE_TONE_CLASS: Record<MetricVarianceTone, string> = {
  positive: STATE_COLOR_CLASS.stable,
  negative: STATE_COLOR_CLASS.risk,
  neutral: STATE_COLOR_CLASS.neutral,
};
