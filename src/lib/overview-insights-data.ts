import overviewInsightsJson from "../../data/overview-insights.json";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { TopStoriesStatus } from "@/lib/insights/generator";
import { EVERGREEN_TOP_STORIES } from "@/lib/insights/evergreen";

type OverviewInsightsFile = {
  generatedAt?: string;
  cards?: LeagueInsightCard[];
  topStories?: LeagueInsightCard[];
  topStoriesStatus?: TopStoriesStatus;
};

const file = overviewInsightsJson as OverviewInsightsFile;

/** Workers-safe: bundled at build time, no matrix compute at request time. */
export function loadOverviewInsightCards(): LeagueInsightCard[] {
  if (Array.isArray(file.cards) && file.cards.length > 0) {
    return file.cards;
  }
  return [];
}

export function loadTopStoriesBundle(): {
  stories: LeagueInsightCard[];
  status: TopStoriesStatus;
  generatedAt: string | null;
} {
  const stories =
    Array.isArray(file.topStories) && file.topStories.length > 0
      ? file.topStories
      : loadOverviewInsightCards().slice(0, 3);

  if (stories.length === 0) {
    return {
      stories: EVERGREEN_TOP_STORIES,
      status: "fallback",
      generatedAt: file.generatedAt ?? null,
    };
  }

  return {
    stories,
    status: file.topStoriesStatus ?? "generated",
    generatedAt: file.generatedAt ?? null,
  };
}
