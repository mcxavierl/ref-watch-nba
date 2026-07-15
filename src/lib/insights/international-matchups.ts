import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  computeRefOriginVariance,
  inferCountryFromBirthplace,
  nationalOriginDistance,
  nationConfederation,
} from "@/lib/geo-correlations";
import { applyClinicalTone } from "@/lib/insights/tone-filter";
import type { InsightOutlierCandidate } from "@/lib/insights/generator-core";
import {
  INTERNATIONAL_INSIGHT_LEAGUES,
  teamNationForLeague,
} from "@/lib/insights/team-nation";
import type { LeagueId } from "@/lib/leagues";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { formatPct } from "@/lib/stats-utils";
import type { RefProfile } from "@/lib/types";

export { INTERNATIONAL_INSIGHT_LEAGUES, teamNationForLeague } from "@/lib/insights/team-nation";

export const MIN_INTERNATIONAL_GAMES = 12;
export const MIN_ORIGIN_DELTA = 0.5;

export type InternationalMatchupHighlight = {
  refSlug: string;
  refName: string;
  refNation: string;
  teamAbbr: string;
  teamLabel: string;
  teamNation: string;
  games: number;
  originDistance: number;
  winRate: number;
  whistleDelta: number;
};

function internationalSignificance(
  distance: number,
  games: number,
  winRate: number,
): number {
  const sampleWeight = Math.log10(games + 1);
  const rateSwing = Math.abs(winRate - 0.5) * 100;
  return distance * sampleWeight * (1 + rateSwing / 50);
}

function scanRefInternationalEdges(
  leagueId: LeagueId,
  ref: RefProfile,
): InternationalMatchupHighlight[] {
  const refNation =
    ref.birthCountry?.trim() ||
    inferCountryFromBirthplace(ref.birthplace) ||
    inferCountryFromBirthplace(ref.hometown);
  if (!refNation || !ref.teamStats) return [];

  const highlights: InternationalMatchupHighlight[] = [];

  for (const [abbr, stat] of Object.entries(ref.teamStats)) {
    if (stat.games < MIN_INTERNATIONAL_GAMES) continue;
    const teamNation = teamNationForLeague(leagueId, abbr);
    if (!teamNation) continue;

    const distance = nationalOriginDistance(refNation, teamNation);
    if (distance < MIN_ORIGIN_DELTA) continue;

    highlights.push({
      refSlug: ref.slug,
      refName: ref.name,
      refNation,
      teamAbbr: abbr,
      teamLabel: abbr,
      teamNation,
      games: stat.games,
      originDistance: distance,
      winRate: stat.winRate,
      whistleDelta: stat.avgFoulDifferential ?? 0,
    });
  }

  return highlights.sort(
    (a, b) => internationalSignificance(b.originDistance, b.games, b.winRate) -
      internationalSignificance(a.originDistance, a.games, a.winRate),
  );
}

/** Scan soccer leagues for referee-origin vs team-origin correlation edges. */
export function scanInternationalMatchupOutliers(): InsightOutlierCandidate[] {
  const candidates: InsightOutlierCandidate[] = [];

  for (const leagueId of INTERNATIONAL_INSIGHT_LEAGUES) {
    const { stats } = loadLeagueStats(leagueId);
    const resolveTeamNation = (abbr: string) => teamNationForLeague(leagueId, abbr);

    for (const ref of stats.refs) {
      const originVariance = computeRefOriginVariance(ref, resolveTeamNation);
      const enriched: RefProfile = {
        ...ref,
        ...(originVariance !== null ? { originVariance } : {}),
      };

      const edges = scanRefInternationalEdges(leagueId, enriched);
      const top = edges[0];
      if (!top) continue;

      const confederation = nationConfederation(top.refNation);
      candidates.push({
        leagueId: leagueId as (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number],
        kind: "international-origin",
        significance: internationalSignificance(
          top.originDistance,
          top.games,
          top.winRate,
        ),
        refSlug: top.refSlug,
        refName: top.refName,
        teamAbbr: top.teamAbbr,
        teamLabel: top.teamLabel,
        ref: enriched,
        internationalHighlight: top,
        originVariance: originVariance ?? undefined,
        refNation: top.refNation,
        teamNation: top.teamNation,
        confederation: confederation ?? undefined,
      });
    }
  }

  return candidates.sort((a, b) => b.significance - a.significance);
}

export function internationalOriginHeadline(
  candidate: InsightOutlierCandidate,
  leagueLabel: string,
): string {
  const highlight = candidate.internationalHighlight;
  if (!highlight) return "";

  const distancePct = formatPct(highlight.originDistance);
  return applyClinicalTone(
    `${highlight.refName} (${highlight.refNation}) shows elevated origin variance ` +
      `(${distancePct}) vs ${highlight.teamLabel} (${highlight.teamNation}) in ${leagueLabel}`,
  );
}

export function internationalOriginStory(
  candidate: InsightOutlierCandidate,
): string {
  const highlight = candidate.internationalHighlight;
  if (!highlight) return "";

  const winPct = formatPct(highlight.winRate);
  const confLabel = candidate.confederation
    ? `${candidate.confederation.toUpperCase()} confederation context`
    : "cross-confederation context";

  return applyClinicalTone(
    `${winPct} win rate across ${highlight.games} games with ${confLabel}. ` +
      "Descriptive referee-origin vs team-origin association only.",
  );
}
