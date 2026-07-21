import {
  findingToLeagueInsightCard,
  type HighlightLeagueId,
} from "@/lib/finding-insight-cards";
import { sortFindingsByStrength } from "@/lib/findings-shared";
import { computeHubFindings } from "@/lib/hub-findings-registry";
import { insightCompellingScore } from "@/lib/insight-editorial";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

const HOMEPAGE_FINDING_LEAGUES: HighlightLeagueId[] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
];

/** One top-ranked dataset finding per pro league for homepage quick-insight pools. */
export function buildCrossLeagueTopFindingCards(
  limit = HOMEPAGE_FINDING_LEAGUES.length,
): LeagueInsightCard[] {
  const cards: LeagueInsightCard[] = [];

  for (const leagueId of HOMEPAGE_FINDING_LEAGUES) {
    const findings = sortFindingsByStrength(
      computeHubFindings(leagueId, 4, []),
    );
    const top = findings[0];
    if (top) {
      cards.push(findingToLeagueInsightCard(leagueId, top));
    }
  }

  return [...cards]
    .sort((a, b) => insightCompellingScore(b) - insightCompellingScore(a))
    .slice(0, limit);
}
