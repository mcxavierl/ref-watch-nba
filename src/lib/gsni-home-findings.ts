import {
  clutchSituationHeadline,
  clutchSituationSummary,
  confidenceTagForMinutes,
  consistencyProfileFromIndex,
  highLeverageMinutesLine,
  type ConsistencyProfile,
} from "@/lib/clutch-consistency-index";
import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import { gsniBand, isExtremeGsni, type GsniBand } from "@/lib/gsni-display";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export const GSNI_HOME_FINDING_LIMIT = 3;
export const GSNI_HOME_MIN_SAMPLE_GAMES = 200;
export const GSNI_NEUTRAL_SCORE = 50;

export type GsniHomeFindingStat = {
  label: string;
  value: string;
  barPct: number;
};

export type GsniHomeFinding = {
  refSlug: string;
  refName: string;
  /** 0-100 Clutch Consistency Index (same underlying score as GSNI). */
  consistencyIndex: number;
  consistencyProfile: ConsistencyProfile;
  band: GsniBand;
  sampleGames: number;
  highLeverageMinutes: number;
  headline: string;
  summary: string;
  minutesLine: string;
  confidenceTag: string | null;
  stats: GsniHomeFindingStat[];
  href: string;
  /** @deprecated Use consistencyIndex */
  gsni: number;
  /** @deprecated Use headline */
  plainTitle: string;
  /** @deprecated Use summary */
  plainSummary: string;
  /** @deprecated Removed from UI */
  vsNeutralDelta: number;
  /** @deprecated Removed from UI */
  vsNeutralLabel: string;
  /** @deprecated Removed from UI */
  caption: string;
};

function sampleBarPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
}

function buildStats(
  sampleGames: number,
  highLeverageMinutes: number,
  maxGames: number,
  maxMinutes: number,
): GsniHomeFindingStat[] {
  return [
    {
      label: "Career games tracked",
      value: String(sampleGames),
      barPct: sampleBarPct(sampleGames, maxGames),
    },
    {
      label: "High-leverage minutes",
      value: `${Math.round(highLeverageMinutes)} min`,
      barPct: sampleBarPct(highLeverageMinutes, maxMinutes),
    },
  ];
}

function toFinding(
  ref: RefProfile,
  maxGames: number,
  maxMinutes: number,
): GsniHomeFinding {
  const consistencyIndex = ref.referee_gsni!;
  const band = gsniBand(consistencyIndex);
  const sampleGames = ref.gsniSampleGames ?? ref.games;
  const highLeverageMinutes = ref.gsniHighLeverageMinutes ?? 0;
  const headline = clutchSituationHeadline(ref.name, consistencyIndex);
  const summary = clutchSituationSummary(consistencyIndex);

  return {
    refSlug: ref.slug,
    refName: ref.name,
    consistencyIndex,
    consistencyProfile: consistencyProfileFromIndex(consistencyIndex),
    band,
    sampleGames,
    highLeverageMinutes,
    headline,
    summary,
    minutesLine: highLeverageMinutesLine(highLeverageMinutes),
    confidenceTag: confidenceTagForMinutes(highLeverageMinutes),
    stats: buildStats(sampleGames, highLeverageMinutes, maxGames, maxMinutes),
    href: `/nfl/refs/${ref.slug}`,
    gsni: consistencyIndex,
    plainTitle: headline,
    plainSummary: summary,
    vsNeutralDelta: consistencyIndex - GSNI_NEUTRAL_SCORE,
    vsNeutralLabel: "",
    caption: "",
  };
}

function isEligible(ref: RefProfile): boolean {
  return (
    ref.referee_gsni !== undefined &&
    isExtremeGsni(ref.referee_gsni) &&
    (ref.gsniSampleGames ?? ref.games) >= GSNI_HOME_MIN_SAMPLE_GAMES &&
    (ref.gsniHighLeverageMinutes ?? 0) >= GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL
  );
}

/** Top clutch consistency findings for the homepage research strip. */
export function buildGsniHomeFindings(
  stats: RefStatsFile,
  limit = GSNI_HOME_FINDING_LIMIT,
): GsniHomeFinding[] {
  const eligible = stats.refs.filter(isEligible);

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

  const selected = picked.slice(0, limit);
  const maxGames = Math.max(
    ...selected.map((ref) => ref.gsniSampleGames ?? ref.games),
    1,
  );
  const maxMinutes = Math.max(
    ...selected.map((ref) => ref.gsniHighLeverageMinutes ?? 0),
    1,
  );

  return selected.map((ref) => toFinding(ref, maxGames, maxMinutes));
}

export function loadGsniHomeFindings(
  limit = GSNI_HOME_FINDING_LIMIT,
): GsniHomeFinding[] {
  const { stats } = loadLeagueStats("nfl");
  return buildGsniHomeFindings(stats, limit);
}

/** @deprecated Score chip removed from homepage clutch cards. */
export function formatGsniHomeDelta(delta: number): string {
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const magnitude = Math.abs(rounded);
  return `${sign}${magnitude} vs 50 avg`;
}
