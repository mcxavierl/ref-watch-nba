import { whistleVsLeaguePct } from "@/lib/scoring-metrics";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { RefProfile } from "@/lib/types";

export type WhistleIndexCrewInput = {
  avgFouls: number;
  foulsDelta: number;
  insufficientSample?: boolean;
};

/** Percent above/below league whistle volume that maps to index 0 or 100. */
export const WHISTLE_INDEX_EXTREME_PCT = 40;

export const WHISTLE_INDEX_HIGH_THRESHOLD = 80;
export const WHISTLE_INDEX_LOW_THRESHOLD = 20;

export type WhistleIndexBand = "low" | "neutral" | "high";

/** Visual band for gauge coloring: 45–55 stays neutral (near league average). */
export type WhistleIndexVisualTone = "neutral" | "low" | "high";

export function whistleIndexVisualTone(index: number): WhistleIndexVisualTone {
  const clamped = Math.max(0, Math.min(100, Math.round(index)));
  if (clamped >= 45 && clamped <= 55) return "neutral";
  return clamped < 50 ? "low" : "high";
}

export function isExtremeWhistleIndex(index: number): boolean {
  return index >= WHISTLE_INDEX_HIGH_THRESHOLD || index <= WHISTLE_INDEX_LOW_THRESHOLD;
}

export function whistleIndexBand(index: number): WhistleIndexBand {
  if (index >= WHISTLE_INDEX_HIGH_THRESHOLD) return "high";
  if (index <= WHISTLE_INDEX_LOW_THRESHOLD) return "low";
  return "neutral";
}

/** Map a percent delta vs league whistle volume to the 0–100 Whistle Index scale. */
export function computeWhistleIndexFromPctDelta(pctVsLeague: number): number {
  const raw = 50 + (pctVsLeague / WHISTLE_INDEX_EXTREME_PCT) * 50;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Normalize whistle/penalty volume into RefWatch's 0–100 Whistle Index.
 * 50 = league average; higher = heavier whistle; lower = quieter crews.
 */
export function computeWhistleIndex(
  avgWhistlePerGame: number,
  leagueAvgWhistlePerGame: number,
): number | null {
  if (
    !Number.isFinite(avgWhistlePerGame) ||
    !Number.isFinite(leagueAvgWhistlePerGame) ||
    leagueAvgWhistlePerGame <= 0 ||
    avgWhistlePerGame < 0
  ) {
    return null;
  }

  const pct = whistleVsLeaguePct(avgWhistlePerGame, leagueAvgWhistlePerGame);
  return computeWhistleIndexFromPctDelta(pct);
}

export function whistleIndexFromCrewMetrics(metrics: WhistleIndexCrewInput): number | null {
  if (metrics.insufficientSample || metrics.avgFouls <= 0) return null;
  const leagueAvg = metrics.avgFouls - metrics.foulsDelta;
  return computeWhistleIndex(metrics.avgFouls, leagueAvg);
}

export function whistleIndexFromRefProfile(profile: RefProfile): number | null {
  if (profile.games <= 0 || profile.avgFouls <= 0) return null;
  const leagueAvg = profile.avgFouls - profile.foulsDelta;
  return computeWhistleIndex(profile.avgFouls, leagueAvg);
}

function parseNumericStat(value: string): number | null {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Best-effort Whistle Index for editorial insight cards. */
export function whistleIndexFromInsightCard(card: LeagueInsightCard): number | null {
  const heroLabel = card.heroLabel.toLowerCase();
  if (
    heroLabel.includes("variance") ||
    heroLabel.includes("whistle") ||
    heroLabel.includes("flag") ||
    heroLabel.includes("foul") ||
    heroLabel.includes("minor")
  ) {
    const pct = parseNumericStat(card.heroValue);
    if (pct !== null) return computeWhistleIndexFromPctDelta(pct);
  }

  const perGameStat = card.stats.find((stat) =>
    /per game|\/g|avg/i.test(stat.label),
  );
  const vsLeagueStat = card.stats.find((stat) =>
    /vs league|delta|variance/i.test(stat.label),
  );

  if (perGameStat && vsLeagueStat) {
    const avg = parseNumericStat(perGameStat.value);
    const delta = parseNumericStat(vsLeagueStat.value);
    if (avg !== null && delta !== null) {
      return computeWhistleIndex(avg, avg - delta);
    }
  }

  if (card.kind === "ref-outlier" && card.heroValue.includes("%")) {
    const pct = parseNumericStat(card.heroValue);
    if (pct !== null) return computeWhistleIndexFromPctDelta(pct);
  }

  return null;
}

export function formatWhistleIndex(index: number): string {
  return String(Math.round(index));
}

export function whistleIndexCaption(index: number): string {
  const band = whistleIndexBand(index);
  if (band === "high") return "Heavy whistle profile";
  if (band === "low") return "Quiet whistle profile";
  return "Near league average";
}
