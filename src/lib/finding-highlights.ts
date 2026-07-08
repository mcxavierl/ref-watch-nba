import type { Finding } from "@/lib/findings-shared";

export type FindingHighlightTone =
  | "over"
  | "under"
  | "neutral"
  | "positive"
  | "negative";

export type FindingHighlightBadge = {
  kind: "badge";
  label: string;
  value: string;
  tone: FindingHighlightTone;
};

export type FindingHighlightBar = {
  kind: "bar";
  label: string;
  magnitude: number;
  maxMagnitude: number;
  tone: FindingHighlightTone;
};

export type FindingHighlight = FindingHighlightBadge | FindingHighlightBar;

const NEUTRAL_PCT_BAND = 2;
const DEFAULT_BAR_MAX = 20;

function pctTone(value: number, baseline = 50): FindingHighlightTone {
  if (value >= baseline + NEUTRAL_PCT_BAND) return "over";
  if (value <= baseline - NEUTRAL_PCT_BAND) return "under";
  return "neutral";
}

function signedTone(value: number): FindingHighlightTone {
  if (value > 0.05) return "positive";
  if (value < -0.05) return "negative";
  return "neutral";
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

function headlinePtsOffNeutral(headline: string): FindingHighlightBar | null {
  const runsMatch = headline.match(
    /runs\s+(over|under)\s+(\d+(?:\.\d+)?)\s*pts?\s+off\s+neutral/i,
  );
  if (runsMatch) {
    const tone = runsMatch[1].toLowerCase() === "over" ? "over" : "under";
    const magnitude = parseFloat(runsMatch[2]);
    return {
      kind: "bar",
      label: `${magnitude} pts off neutral`,
      magnitude,
      maxMagnitude: DEFAULT_BAR_MAX,
      tone,
    };
  }

  const leansMatch = headline.match(
    /(overs?|unders?)\s+with\s+this\s+crew\s+(\d+(?:\.\d+)?)\s*pts?\s+off\s+neutral/i,
  );
  if (leansMatch) {
    const tone = leansMatch[1].toLowerCase().startsWith("over") ? "over" : "under";
    const magnitude = parseFloat(leansMatch[2]);
    return {
      kind: "bar",
      label: `${magnitude} pts off neutral`,
      magnitude,
      maxMagnitude: DEFAULT_BAR_MAX,
      tone,
    };
  }

  return null;
}

function statHighlights(finding: Finding): FindingHighlight[] {
  const highlights: FindingHighlight[] = [];

  for (const stat of finding.stats) {
    const pct = parsePct(stat.value);
    if (pct != null) {
      const baseline = parseBaselineFromDetail(stat.detail) ?? 50;
      highlights.push({
        kind: "badge",
        label: stat.label,
        value: stat.value,
        tone: pctTone(pct, baseline),
      });
      continue;
    }

    const signed = parseSignedNumber(stat.value);
    if (signed != null && stat.label.toLowerCase().includes("delta")) {
      highlights.push({
        kind: "badge",
        label: stat.label,
        value: stat.value,
        tone: signedTone(signed),
      });
    }
  }

  return highlights;
}

export function findingHighlightMetrics(finding: Finding): FindingHighlight[] {
  const highlights: FindingHighlight[] = [];
  const bar = headlinePtsOffNeutral(finding.headline);
  if (bar) highlights.push(bar);

  const statBadges = statHighlights(finding);
  const seen = new Set<string>();

  for (const item of statBadges) {
    if (item.kind !== "badge") continue;
    const key = `${item.label}:${item.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    highlights.push(item);
    if (highlights.length >= 4) break;
  }

  return highlights;
}
