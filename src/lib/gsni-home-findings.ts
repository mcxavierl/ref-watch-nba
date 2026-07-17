import { GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL } from "@/lib/gsni";
import {
  formatGsni,
  gsniBand,
  gsniCaption,
  isExtremeGsni,
  type GsniBand,
} from "@/lib/gsni-display";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export const GSNI_HOME_FINDING_LIMIT = 3;
export const GSNI_HOME_MIN_SAMPLE_GAMES = 200;

export type GsniHomeFinding = {
  refSlug: string;
  refName: string;
  gsni: number;
  band: GsniBand;
  caption: string;
  sampleGames: number;
  highLeverageMinutes: number;
  headline: string;
  detail: string;
  href: string;
};

function findingHeadline(refName: string, gsni: number, band: GsniBand): string {
  const score = formatGsni(gsni);
  if (band === "quiet") {
    return `${refName} runs state-quiet in clutch minutes (GSNI ${score})`;
  }
  return `${refName} runs state-heavy in clutch minutes (GSNI ${score})`;
}

function toFinding(ref: RefProfile): GsniHomeFinding {
  const gsni = ref.referee_gsni!;
  const band = gsniBand(gsni);
  const sampleGames = ref.gsniSampleGames ?? ref.games;
  const highLeverageMinutes = ref.gsniHighLeverageMinutes ?? 0;

  return {
    refSlug: ref.slug,
    refName: ref.name,
    gsni,
    band,
    caption: gsniCaption(gsni),
    sampleGames,
    highLeverageMinutes,
    headline: findingHeadline(ref.name, gsni, band),
    detail: `${sampleGames}-game sample · ${highLeverageMinutes.toFixed(0)} high-leverage min`,
    href: `/nfl/refs/${ref.slug}`,
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

/** Top Game-State Index findings for the homepage research strip. */
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

  return picked.slice(0, limit).map(toFinding);
}

export function loadGsniHomeFindings(
  limit = GSNI_HOME_FINDING_LIMIT,
): GsniHomeFinding[] {
  const { stats } = loadLeagueStats("nfl");
  return buildGsniHomeFindings(stats, limit);
}
