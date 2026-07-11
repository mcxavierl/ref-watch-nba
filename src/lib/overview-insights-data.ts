import overviewInsightsJson from "../../data/overview-insights.json";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

type OverviewInsightsFile = {
  generatedAt?: string;
  cards: LeagueInsightCard[];
};

/** Workers-safe: bundled at build time, no matrix compute at request time. */
export function loadOverviewInsightCards(): LeagueInsightCard[] {
  const file = overviewInsightsJson as OverviewInsightsFile;
  if (Array.isArray(file.cards) && file.cards.length > 0) {
    return file.cards;
  }
  return [];
}
