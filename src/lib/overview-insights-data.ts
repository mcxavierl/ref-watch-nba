import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { TopStoriesStatus } from "@/lib/insights/generator";
import {
  loadInsightsBundle,
  loadOverviewInsightCards,
  type InsightsQueryResult,
} from "@/lib/insights/insights-query";

export { loadInsightsBundle, loadOverviewInsightCards };
export type { InsightsQueryResult };

export function loadTopStoriesBundle(): {
  stories: LeagueInsightCard[];
  status: TopStoriesStatus;
  generatedAt: string | null;
} {
  const bundle = loadInsightsBundle();
  return {
    stories: bundle.insights,
    status: bundle.status,
    generatedAt: bundle.generatedAt,
  };
}
