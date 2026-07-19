import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
  GSNI_THRESHOLD,
} from "@/lib/gsni";
import {
  gsniBand,
  gsniCaption,
  gsniInsightSummary,
  gsniShrinkageFromProfile,
  type GsniBand,
} from "@/lib/gsni-display";
import type { InsightsLeagueId } from "@/lib/league-manifest";
import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export { GSNI_THRESHOLD };

export const GSNI_RESEARCH_HIGHLIGHT_LIMIT = 6;
export const GSNI_RESEARCH_MIN_SAMPLE_GAMES = 50;

export type GsniConfidenceInterval = {
  lower: number;
  upper: number;
};

export type GsniResearchRow = {
  refSlug: string;
  refName: string;
  /** Shrunk index score shown in the UI. */
  gsni: number | null;
  /** Raw observed index score before empirical-Bayes shrinkage. */
  gsniObserved: number | null;
  rawScore: number | null;
  gsniShrinkageTooltip: string | null;
  /** Per-game divergence spread in index-score σ units (standard error proxy). */
  standardError: number | null;
  confidenceInterval: GsniConfidenceInterval | null;
  /** True when |index score| meets or exceeds GSNI_THRESHOLD. */
  highVariance: boolean;
  volatility: number | null;
  band: GsniBand | null;
  caption: string | null;
  sampleGames: number;
  highLeverageMinutes: number;
  gateCleared: boolean;
  href: string;
  gameStateHref: string;
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
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Whether an index score qualifies as a high-variance outlier (|score| >= GSNI_THRESHOLD). */
export function gsniQualifiesHighVariance(
  score: number | null | undefined,
  threshold = GSNI_THRESHOLD,
): boolean {
  return (
    score !== null &&
    score !== undefined &&
    Number.isFinite(score) &&
    Math.abs(score) >= threshold
  );
}

export function gsniAbsScore(score: number | null | undefined): number {
  if (score === null || score === undefined || !Number.isFinite(score)) return -1;
  return Math.abs(score);
}

export function compareGsniByAbsDesc(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return gsniAbsScore(b) - gsniAbsScore(a);
}

export function gsniStandardError(
  volatility: number | null | undefined,
): number | null {
  if (volatility === null || volatility === undefined || !Number.isFinite(volatility)) {
    return null;
  }
  return volatility;
}

export function gsniConfidenceInterval(
  score: number,
  standardError: number | null,
): GsniConfidenceInterval | null {
  if (standardError === null) return null;
  return {
    lower: round1(score - standardError),
    upper: round1(score + standardError),
  };
}

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
  const standardError = cleared
    ? gsniStandardError(ref.referee_gsni_volatility)
    : null;
  const confidenceInterval =
    displayGsni !== null && cleared
      ? gsniConfidenceInterval(displayGsni, standardError)
      : null;

  return {
    refSlug: ref.slug,
    refName: ref.name,
    gsni: displayGsni,
    gsniObserved: observedGsni,
    rawScore: observedGsni,
    gsniShrinkageTooltip: shrinkage?.tooltip ?? null,
    standardError,
    confidenceInterval,
    highVariance: gsniQualifiesHighVariance(displayGsni),
    volatility: cleared ? (ref.referee_gsni_volatility ?? null) : null,
    band,
    caption: displayGsni !== null && cleared ? gsniCaption(displayGsni) : null,
    sampleGames: ref.gsniSampleGames ?? ref.games,
    highLeverageMinutes: ref.gsniHighLeverageMinutes ?? 0,
    gateCleared: cleared,
    href: `${basePath}/refs/${ref.slug}`,
    gameStateHref: `${basePath}/research/game-state#gsni-official-table`,
  };
}

function highlightHeadline(gsni: number): string {
  return gsniInsightSummary(gsni);
}

function toHighlight(row: GsniResearchRow): GsniResearchHighlight {
  return {
    ...row,
    headline: highlightHeadline(row.gsni!),
    detail: `${row.sampleGames}-game sample · ${row.highLeverageMinutes.toFixed(0)} high-leverage min`,
  };
}

function isHighlightEligible(
  ref: RefProfile,
  minHighLeverageMinutes: number,
  highVarianceOnly: boolean,
): boolean {
  const shrinkage = gsniShrinkageFromProfile(ref);
  const display = shrinkage?.display;
  return (
    gateCleared(ref, minHighLeverageMinutes) &&
    shrinkage !== null &&
    display !== undefined &&
    (!highVarianceOnly || gsniQualifiesHighVariance(display)) &&
    (ref.gsniSampleGames ?? ref.games) >= GSNI_RESEARCH_MIN_SAMPLE_GAMES
  );
}

function sortedGateClearedRows(rows: GsniResearchRow[]): GsniResearchRow[] {
  return rows
    .filter((row) => row.gateCleared && row.gsni !== null)
    .sort((a, b) => compareGsniByAbsDesc(a.gsni, b.gsni));
}

function allResearchRows(rows: GsniResearchRow[]): GsniResearchRow[] {
  return [...rows].sort((a, b) => {
    if (a.gateCleared !== b.gateCleared) return a.gateCleared ? -1 : 1;
    if (a.gateCleared && b.gateCleared) {
      return compareGsniByAbsDesc(a.gsni, b.gsni);
    }
    return b.highLeverageMinutes - a.highLeverageMinutes;
  });
}

function highVarianceRows(rows: GsniResearchRow[]): GsniResearchRow[] {
  return sortedGateClearedRows(rows).filter((row) => row.highVariance);
}

export type GsniResearchBuildOptions = {
  /** When true (default), return only |score| >= GSNI_THRESHOLD officials. */
  highVarianceOnly?: boolean;
};

export function buildGsniResearchRows(
  stats: RefStatsFile,
  config: GsniLeagueResearchConfig,
  options: GsniResearchBuildOptions = {},
): GsniResearchRow[] {
  const { highVarianceOnly = true } = options;
  const rows = stats.refs
    .filter(
      (ref) =>
        (ref.gsniHighLeverageMinutes ?? 0) > 0 ||
        ref.referee_gsni !== undefined,
    )
    .map((ref) => toRow(ref, config.basePath, config.minHighLeverageMinutes));

  return highVarianceOnly ? highVarianceRows(rows) : allResearchRows(rows);
}

export function buildGsniResearchHighlights(
  stats: RefStatsFile,
  config: GsniLeagueResearchConfig,
  options: GsniResearchBuildOptions & { limit?: number } = {},
): GsniResearchHighlight[] {
  const { highVarianceOnly = true, limit = GSNI_RESEARCH_HIGHLIGHT_LIMIT } =
    options;
  const eligible = stats.refs.filter((ref) =>
    isHighlightEligible(ref, config.minHighLeverageMinutes, highVarianceOnly),
  );
  eligible.sort((a, b) => {
    const aDisplay = gsniShrinkageFromProfile(a)?.display;
    const bDisplay = gsniShrinkageFromProfile(b)?.display;
    const absDiff = compareGsniByAbsDesc(aDisplay, bDisplay);
    if (absDiff !== 0) return absDiff;
    return (b.gsniSampleGames ?? b.games) - (a.gsniSampleGames ?? a.games);
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

/** DOM id for a GSNI official table row (scroll target from anomaly callouts). */
export function gsniOfficialRowAnchor(refSlug: string): string {
  return `gsni-row-${refSlug}`;
}

export const GSNI_ANOMALY_HIGHLIGHT_MIN = 3;
export const GSNI_ANOMALY_HIGHLIGHT_MAX = 6;
