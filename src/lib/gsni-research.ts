import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
} from "@/lib/gsni";
import {
  gsniBand,
  gsniCaption,
  gsniShrinkageFromProfile,
  isExtremeGsni,
  type GsniBand,
} from "@/lib/gsni-display";
import type { InsightsLeagueId } from "@/lib/league-manifest";
import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export const GSNI_RESEARCH_HIGHLIGHT_LIMIT = 4;
export const GSNI_RESEARCH_MIN_SAMPLE_GAMES = 100;

export type GsniResearchRow = {
  refSlug: string;
  refName: string;
  gsni: number | null;
  gsniObserved: number | null;
  gsniShrinkageTooltip: string | null;
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

export type GsniLeagueResearchConfig = {
  leagueId: InsightsLeagueId;
  basePath: string;
  minHighLeverageMinutes: number;
};

const GSNI_LEAGUE_CONFIG: Partial<Record<InsightsLeagueId, GsniLeagueResearchConfig>> = {
  nfl: {
    leagueId: "nfl",
    basePath: "/nfl",
    minHighLeverageMinutes: GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
  },
  nba: {
    leagueId: "nba",
    basePath: "/nba",
    minHighLeverageMinutes: GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  },
  nhl: {
    leagueId: "nhl",
    basePath: "/nhl",
    minHighLeverageMinutes: GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  },
};

export function gsniResearchConfigForLeague(
  leagueId: InsightsLeagueId,
): GsniLeagueResearchConfig | null {
  return GSNI_LEAGUE_CONFIG[leagueId] ?? null;
}

export function leagueSupportsGsniResearch(leagueId: InsightsLeagueId): boolean {
  return gsniResearchConfigForLeague(leagueId) !== null;
}

function gateCleared(ref: RefProfile, minHighLeverageMinutes: number): boolean {
  return (
    ref.referee_gsni !== undefined &&
    (ref.gsniHighLeverageMinutes ?? 0) >= minHighLeverageMinutes
  );
}

function toRow(
  ref: RefProfile,
  basePath: string,
  minHighLeverageMinutes: number,
): GsniResearchRow {
  const cleared = gateCleared(ref, minHighLeverageMinutes);
  const shrinkage = cleared ? gsniShrinkageFromProfile(ref) : null;
  const displayGsni = shrinkage?.display ?? null;
  const observedGsni = shrinkage?.observed ?? ref.referee_gsni ?? null;
  const band =
    displayGsni !== null && cleared ? gsniBand(displayGsni) : null;

  return {
    refSlug: ref.slug,
    refName: ref.name,
    gsni: displayGsni,
    gsniObserved: observedGsni,
    gsniShrinkageTooltip: shrinkage?.tooltip ?? null,
    volatility: cleared ? (ref.referee_gsni_volatility ?? null) : null,
    band,
    caption: displayGsni !== null && cleared ? gsniCaption(displayGsni) : null,
    sampleGames: ref.gsniSampleGames ?? ref.games,
    highLeverageMinutes: ref.gsniHighLeverageMinutes ?? 0,
    gateCleared: cleared,
    href: `${basePath}/refs/${ref.slug}`,
  };
}

function highlightHeadline(band: GsniBand): string {
  if (band === "quiet") return "Quiet in clutch states";
  if (band === "heavy") return "Heavy in clutch states";
  return "League-average in clutch states";
}

function toHighlight(row: GsniResearchRow): GsniResearchHighlight {
  const band = row.band!;
  return {
    ...row,
    headline: highlightHeadline(band),
    detail: `${row.sampleGames}-game sample · ${row.highLeverageMinutes.toFixed(0)} high-leverage min`,
  };
}

function isHighlightEligible(
  ref: RefProfile,
  minHighLeverageMinutes: number,
): boolean {
  const shrinkage = gsniShrinkageFromProfile(ref);
  return (
    gateCleared(ref, minHighLeverageMinutes) &&
    shrinkage !== null &&
    isExtremeGsni(shrinkage.display) &&
    (ref.gsniSampleGames ?? ref.games) >= GSNI_RESEARCH_MIN_SAMPLE_GAMES
  );
}

export function buildGsniResearchRows(
  stats: RefStatsFile,
  config: GsniLeagueResearchConfig,
): GsniResearchRow[] {
  return stats.refs
    .filter(
      (ref) =>
        (ref.gsniHighLeverageMinutes ?? 0) > 0 ||
        ref.referee_gsni !== undefined,
    )
    .map((ref) => toRow(ref, config.basePath, config.minHighLeverageMinutes))
    .sort((a, b) => {
      if (a.gateCleared !== b.gateCleared) return a.gateCleared ? -1 : 1;
      const aScore = a.gsni ?? -1;
      const bScore = b.gsni ?? -1;
      if (aScore !== bScore) return bScore - aScore;
      return b.highLeverageMinutes - a.highLeverageMinutes;
    });
}

export function buildGsniResearchHighlights(
  stats: RefStatsFile,
  config: GsniLeagueResearchConfig,
  limit = GSNI_RESEARCH_HIGHLIGHT_LIMIT,
): GsniResearchHighlight[] {
  const eligible = stats.refs.filter((ref) =>
    isHighlightEligible(ref, config.minHighLeverageMinutes),
  );
  eligible.sort((a, b) => {
    const sampleDiff =
      (b.gsniSampleGames ?? b.games) - (a.gsniSampleGames ?? a.games);
    if (sampleDiff !== 0) return sampleDiff;
    const aDisplay = gsniShrinkageFromProfile(a)?.display ?? 0;
    const bDisplay = gsniShrinkageFromProfile(b)?.display ?? 0;
    return Math.abs(bDisplay) - Math.abs(aDisplay);
  });

  const quiet = eligible.filter((ref) => {
    const display = gsniShrinkageFromProfile(ref)?.display;
    return display !== undefined && gsniBand(display) === "quiet";
  });
  const heavy = eligible.filter((ref) => {
    const display = gsniShrinkageFromProfile(ref)?.display;
    return display !== undefined && gsniBand(display) === "heavy";
  });

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
    .map((ref) =>
      toHighlight(toRow(ref, config.basePath, config.minHighLeverageMinutes)),
    );
}

export function gsniResearchBasePath(leagueId: InsightsLeagueId): string {
  return LEAGUE_MANIFEST[leagueId].pathPrefix;
}
