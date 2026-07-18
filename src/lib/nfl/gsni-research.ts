import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import {
  gsniBand,
  gsniCaption,
  isExtremeGsni,
  type GsniBand,
} from "@/lib/gsni-display";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export const GSNI_RESEARCH_HIGHLIGHT_LIMIT = 4;
export const GSNI_RESEARCH_MIN_SAMPLE_GAMES = 100;

export type GsniResearchRow = {
  refSlug: string;
  refName: string;
  gsni: number | null;
  volatility: number | null;
  band: GsniBand | null;
  caption: string | null;
  sampleGames: number;
  highLeverageMinutes: number;
  gateCleared: boolean;
  href: string;
};

export type GsniResearchHighlight = GsniResearchRow & {
  headline: string;
  detail: string;
};

function gateCleared(ref: RefProfile): boolean {
  return (
    ref.referee_gsni !== undefined &&
    (ref.gsniHighLeverageMinutes ?? 0) >= GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL
  );
}

function toRow(ref: RefProfile, basePath: string): GsniResearchRow {
  const gsni = ref.referee_gsni ?? null;
  const cleared = gateCleared(ref);
  const band = gsni !== null && cleared ? gsniBand(gsni) : null;

  return {
    refSlug: ref.slug,
    refName: ref.name,
    gsni: cleared ? gsni : null,
    volatility: cleared ? (ref.referee_gsni_volatility ?? null) : null,
    band,
    caption: gsni !== null && cleared ? gsniCaption(gsni) : null,
    sampleGames: ref.gsniSampleGames ?? ref.games,
    highLeverageMinutes: ref.gsniHighLeverageMinutes ?? 0,
    gateCleared: cleared,
    href: `${basePath}/refs/${ref.slug}`,
  };
}

function highlightHeadline(band: GsniBand): string {
  if (band === "quiet") return "State-quiet in clutch";
  if (band === "heavy") return "State-heavy in clutch";
  return "League-neutral in clutch";
}

function toHighlight(row: GsniResearchRow): GsniResearchHighlight {
  const band = row.band!;
  return {
    ...row,
    headline: highlightHeadline(band),
    detail: `${row.sampleGames}-game sample · ${row.highLeverageMinutes.toFixed(0)} high-leverage min`,
  };
}

function isHighlightEligible(ref: RefProfile): boolean {
  return (
    gateCleared(ref) &&
    ref.referee_gsni !== undefined &&
    isExtremeGsni(ref.referee_gsni) &&
    (ref.gsniSampleGames ?? ref.games) >= GSNI_RESEARCH_MIN_SAMPLE_GAMES
  );
}

/** Officials with any tracked high-leverage GSNI sample. */
export function buildGsniResearchRows(
  stats: RefStatsFile,
  basePath = "/nfl",
): GsniResearchRow[] {
  return stats.refs
    .filter(
      (ref) =>
        (ref.gsniHighLeverageMinutes ?? 0) > 0 ||
        ref.referee_gsni !== undefined,
    )
    .map((ref) => toRow(ref, basePath))
    .sort((a, b) => {
      if (a.gateCleared !== b.gateCleared) return a.gateCleared ? -1 : 1;
      const aScore = a.gsni ?? -1;
      const bScore = b.gsni ?? -1;
      if (aScore !== bScore) return bScore - aScore;
      return b.highLeverageMinutes - a.highLeverageMinutes;
    });
}

/** Top quiet/heavy Game-State Index profiles for the research hero strip. */
export function buildGsniResearchHighlights(
  stats: RefStatsFile,
  basePath = "/nfl",
  limit = GSNI_RESEARCH_HIGHLIGHT_LIMIT,
): GsniResearchHighlight[] {
  const eligible = stats.refs.filter(isHighlightEligible);
  eligible.sort((a, b) => {
    const sampleDiff =
      (b.gsniSampleGames ?? b.games) - (a.gsniSampleGames ?? a.games);
    if (sampleDiff !== 0) return sampleDiff;
    return Math.abs(b.referee_gsni! - 50) - Math.abs(a.referee_gsni! - 50);
  });

  const quiet = eligible.filter((ref) => gsniBand(ref.referee_gsni!) === "quiet");
  const heavy = eligible.filter((ref) => gsniBand(ref.referee_gsni!) === "heavy");

  const picked: RefProfile[] = [];
  if (quiet[0]) picked.push(quiet[0]);
  if (heavy[0]) picked.push(heavy[0]);
  if (picked.length < limit && quiet[1]) picked.push(quiet[1]);
  if (picked.length < limit && heavy[1]) picked.push(heavy[1]);
  for (const ref of eligible) {
    if (picked.length >= limit) break;
    if (!picked.some((row) => row.slug === ref.slug)) picked.push(ref);
  }

  return picked
    .slice(0, limit)
    .map((ref) => toHighlight(toRow(ref, basePath)));
}
