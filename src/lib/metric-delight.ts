import type { FindingStat } from "@/lib/findings-shared";
import type { MatrixCellExtreme } from "@/lib/ref-team-matrix";

type FindingHighlightTone =
  | "over"
  | "under"
  | "neutral"
  | "positive"
  | "negative";

/** Unified tone vocabulary for standout / directional stats across Ref Watch. */
export type MetricDelightTone =
  | "positive"
  | "negative"
  | "neutral"
  | "standout-high"
  | "standout-low";

export type MetricDelightSurface =
  | "badge"
  | "badge-value"
  | "value"
  | "value-hero"
  | "bar"
  | "bar-fill"
  | "delta"
  | "flag"
  | "card"
  | "cell-extreme";

const POSITIVE_TONES = new Set<MetricDelightTone>(["positive", "standout-high"]);
const NEGATIVE_TONES = new Set<MetricDelightTone>(["negative", "standout-low"]);

export function isStandoutTone(tone: MetricDelightTone): boolean {
  return tone === "standout-high" || tone === "standout-low";
}

export function isDirectionalTone(tone: MetricDelightTone): boolean {
  return tone !== "neutral";
}

export function highlightToneToDelight(tone: FindingHighlightTone): MetricDelightTone {
  switch (tone) {
    case "over":
    case "positive":
      return "positive";
    case "under":
    case "negative":
      return "negative";
    default:
      return "neutral";
  }
}

export function matrixExtremeTone(kind: MatrixCellExtreme): MetricDelightTone {
  return kind === "high" ? "standout-high" : "standout-low";
}

export function signedDeltaTone(
  value: number,
  threshold = 0,
): "positive" | "negative" | "neutral" {
  if (value > threshold) return "positive";
  if (value < -threshold) return "negative";
  return "neutral";
}

export function metricDelightClass(
  tone: MetricDelightTone,
  surface: MetricDelightSurface,
): string {
  const base = `metric-delight-${surface}`;
  if (tone === "neutral") {
    return `${base} ${base}--neutral`.trim();
  }
  const directional =
    POSITIVE_TONES.has(tone) ? "positive" : NEGATIVE_TONES.has(tone) ? "negative" : "neutral";
  const standout = isStandoutTone(tone) ? ` ${base}--standout` : "";
  return `${base} ${base}--${directional}${standout}`.trim();
}

function parsePct(value: string): number | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

function parseBaselineFromDetail(detail?: string): number | null {
  if (!detail) return null;
  const match = detail.match(/(?:vs|baseline|neutral)\s+(-?\d+(?:\.\d+)?)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

function parseSignedNumber(value: string): number | null {
  const match = value.match(/^([+-]?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

const NEUTRAL_PCT_BAND = 2;

/** Resolve delight tone for a finding stat cell (matches finding-highlights heuristics). */
export function findingStatDelightTone(stat: FindingStat): MetricDelightTone {
  const pct = parsePct(stat.value) ?? parsePct(stat.detail ?? "");
  if (pct != null) {
    const baseline = parseBaselineFromDetail(stat.detail) ?? 50;
    if (pct >= baseline + NEUTRAL_PCT_BAND) return "positive";
    if (pct <= baseline - NEUTRAL_PCT_BAND) return "negative";
    return "neutral";
  }

  const signed = parseSignedNumber(stat.value);
  if (signed != null) {
    if (stat.label.toLowerCase().includes("delta")) {
      return highlightToneToDelight(
        signed > 0.05 ? "positive" : signed < -0.05 ? "negative" : "neutral",
      );
    }
    if (Math.abs(signed) >= 12) {
      return signed > 0 ? "standout-high" : "standout-low";
    }
    if (Math.abs(signed) >= 2) {
      return signed > 0 ? "positive" : "negative";
    }
  }

  return "neutral";
}

export function statValueDelightTone(value: string): MetricDelightTone {
  const trimmed = value.trim();
  if (trimmed.startsWith("+") && !/^\+0(\.0+)?(\s|$|%)/.test(trimmed)) {
    const num = parseSignedNumber(trimmed);
    if (num != null && Math.abs(num) >= 12) return "standout-high";
    return "positive";
  }
  if (trimmed.startsWith("-")) {
    const num = parseSignedNumber(trimmed);
    if (num != null && Math.abs(num) >= 12) return "standout-low";
    return "negative";
  }
  return "neutral";
}
