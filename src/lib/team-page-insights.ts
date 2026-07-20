import {
  candidateToInsightCard,
  dedupeCards,
} from "@/lib/insights/generator-core";
import {
  isAllowedInsightLeague,
  scanLeagueOutliers,
} from "@/lib/insights/generator";
import { loadInsightsBundle } from "@/lib/insights/insights-query";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";

export const TEAM_PAGE_INSIGHT_LIMIT = 3;

function heroValueMagnitude(value: string): number {
  const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Math.abs(Number.parseFloat(match[1]));
}

function sortBySignificance(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  return [...cards].sort(
    (a, b) => heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue),
  );
}

/**
 * Prefer distinct insight kinds on team pages. Win-rate matrix edges are already
 * tabulated in TeamSplitView below, so show at most one matrix card and favor
 * whistle or league-pattern cards for the remaining slots.
 */
export function prioritizeTeamPageCards(
  cards: LeagueInsightCard[],
  limit = TEAM_PAGE_INSIGHT_LIMIT,
): LeagueInsightCard[] {
  const sorted = sortBySignificance(dedupeCards(cards));
  const picked: LeagueInsightCard[] = [];
  let matrixIncluded = false;

  const matrix = sorted.find((card) => card.kind === "matrix-edge");
  if (matrix) {
    picked.push(matrix);
    matrixIncluded = true;
  }

  for (const kind of ["ref-outlier", "league-pattern"] as const) {
    if (picked.length >= limit) break;
    const card = sorted.find(
      (entry) => entry.kind === kind && !picked.includes(entry),
    );
    if (card) picked.push(card);
  }

  if (picked.length < limit) {
    for (const card of sorted) {
      if (picked.length >= limit) break;
      if (picked.includes(card)) continue;
      if (card.kind === "matrix-edge" && matrixIncluded) continue;
      picked.push(card);
    }
  }

  return picked;
}

function runtimeTeamInsightCards(
  leagueId: LeagueId,
  teamAbbr: string,
): LeagueInsightCard[] {
  if (!isAllowedInsightLeague(leagueId)) return [];

  const abbr = teamAbbr.toUpperCase();
  const outliers = scanLeagueOutliers(
    leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number],
  )
    .filter((candidate) => candidate.teamAbbr?.toUpperCase() === abbr)
    .sort((a, b) => b.significance - a.significance);

  return dedupeCards(outliers.map(candidateToInsightCard));
}

/** Team-scoped LeagueInsightCard pool for team pages (editorial InsightCard UI). */
export function loadTeamPageInsightCards(
  leagueId: LeagueId,
  teamAbbr: string,
  limit = TEAM_PAGE_INSIGHT_LIMIT,
): LeagueInsightCard[] {
  const abbr = teamAbbr.toUpperCase();
  const bundled = loadInsightsBundle({ teamId: abbr, limit: limit * 2 }).insights.filter(
    (card) => card.leagueId === leagueId,
  );

  const pool = bundled.length > 0 ? bundled : runtimeTeamInsightCards(leagueId, abbr);
  return prioritizeTeamPageCards(pool, limit);
}
