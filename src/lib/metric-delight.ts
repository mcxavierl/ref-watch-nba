import type { FindingStat } from "@/lib/findings-shared";
import {
  DELTA_SIGNIFICANT_ABS,
  DELTA_STANDOUT_ABS,
  FINDING_DELTA_SIGNIFICANT_ABS,
  RATE_SIGNIFICANT_PCT,
  significantSignedTone,
  statValueSignificanceTone,
} from "@/lib/metric-significance";
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
  | "kicker"
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
  threshold = DELTA_SIGNIFICANT_ABS,
): "positive" | "negative" | "neutral" {
  return significantSignedTone(value, threshold);
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

const SAMPLE_STAT_LABEL = /^sample$/i;

const LEAGUE_BASELINE_DETAIL =
  /(?:vs\.?|versus)\s*(?:[\d.]+\s*)?(?:league\s*)?(?:avg|average|baseline)|league\s*(?:avg|average|baseline)/i;

const LEAGUE_BASELINE_LABEL =
  /\b(whistle|scoring|foul|minor|flag|penalty|card|goal|pace|pim|yards?)\b/i;

/** Comparative lines tied to league average — neutral by default (data honesty). */
export function isLeagueBaselineComparisonStat(stat: FindingStat): boolean {
  if (isContextualBenchmarkStat(stat)) return true;

  const detail = stat.detail ?? "";
  if (LEAGUE_BASELINE_DETAIL.test(detail)) return true;

  const label = stat.label.trim();
  if (SAMPLE_STAT_LABEL.test(label)) return true;

  if (LEAGUE_BASELINE_LABEL.test(label.toLowerCase())) return true;

  if (/delta vs/i.test(label) && LEAGUE_BASELINE_DETAIL.test(detail)) return true;

  return false;
}

/** Only betting-market deltas may use semantic red/green on card surfaces. */
export function allowsSemanticDeltaTone(stat: FindingStat): boolean {
  if (isLeagueBaselineComparisonStat(stat)) return false;
  const label = stat.label.toLowerCase();
  return (
    label.includes("o/u ats") ||
    /\bats\b/.test(label) ||
    label.includes("over benchmark") ||
    label.includes("under benchmark") ||
    label.includes("at benchmark")
  );
}

/** Contextual over/under rate - muted, not semantically colored. */
export function isContextualBenchmarkStat(stat: FindingStat): boolean {
  const label = stat.label.toLowerCase();
  return (
    label.includes("over benchmark") ||
    label.includes("under benchmark") ||
    label.includes("at benchmark")
  );
}

/** Resolve delight tone for a finding stat cell (matches finding-highlights heuristics). */
export function findingStatDelightTone(stat: FindingStat): MetricDelightTone {
  const label = stat.label.toLowerCase();

  if (SAMPLE_STAT_LABEL.test(stat.label.trim())) {
    return "neutral";
  }

  if (!allowsSemanticDeltaTone(stat)) {
    return "neutral";
  }

  if (isContextualBenchmarkStat(stat)) {
    return "neutral";
  }

  if (label.includes("games") && !stat.value.includes("%")) {
    return "neutral";
  }

  const pct = parsePct(stat.value) ?? parsePct(stat.detail ?? "");
  if (pct != null) {
    const baseline = parseBaselineFromDetail(stat.detail) ?? 50;
    if (pct >= baseline + RATE_SIGNIFICANT_PCT) return "positive";
    if (pct <= baseline - RATE_SIGNIFICANT_PCT) return "negative";
    return "neutral";
  }

  const signed = parseSignedNumber(stat.value);
  if (signed != null) {
    if (stat.label.toLowerCase().includes("delta")) {
      return highlightToneToDelight(
        significantSignedTone(signed, FINDING_DELTA_SIGNIFICANT_ABS),
      );
    }
    if (Math.abs(signed) >= DELTA_STANDOUT_ABS) {
      return signed > 0 ? "standout-high" : "standout-low";
    }
    if (Math.abs(signed) >= DELTA_SIGNIFICANT_ABS) {
      return signed > 0 ? "positive" : "negative";
    }
  }

  return "neutral";
}

export function statValueDelightTone(value: string): MetricDelightTone {
  return statValueSignificanceTone(value);
}
