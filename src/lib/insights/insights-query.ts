import overviewInsightsJson from "../../../data/overview-insights.json";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { EVERGREEN_TOP_STORIES } from "@/lib/insights/evergreen";
import type { TopStoriesStatus } from "@/lib/insights/generator";
import { isProOnlyLiveLeague, isCollegeLiveLeague } from "@/lib/verified-live-leagues";

export const INSIGHTS_PUBLIC_PATH = "/data/insights.json";

export type InsightsPayload = {
  generatedAt?: string;
  cards?: LeagueInsightCard[];
  topStories?: LeagueInsightCard[];
  topStoriesStatus?: TopStoriesStatus;
};

export type InsightsQueryResult = {
  insights: LeagueInsightCard[];
  status: TopStoriesStatus;
  generatedAt: string | null;
};

export type InsightsQueryOptions = {
  teamId?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 3;

function bundledPayload(): InsightsPayload {
  return overviewInsightsJson as InsightsPayload;
}

function heroValueMagnitude(value: string): number {
  const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Math.abs(Number.parseFloat(match[1]));
}

function insightKey(card: LeagueInsightCard): string {
  return card.drilldownId ?? `${card.leagueId}--${card.refSlug ?? ""}--${card.teamAbbr ?? ""}--${card.headline}`;
}

function sortBySignificance(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  return [...cards].sort(
    (a, b) => heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue),
  );
}

function isInternationalOriginCard(card: LeagueInsightCard): boolean {
  const haystack = `${card.headline} ${card.story}`.toLowerCase();
  return (
    haystack.includes("origin variance") ||
    haystack.includes("confederation") ||
    haystack.includes("cross-confederation")
  );
}

function filterOverviewInsightCards(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  return cards.filter(
    (card) =>
      (isProOnlyLiveLeague(card.leagueId) || isCollegeLiveLeague(card.leagueId)) &&
      !isInternationalOriginCard(card),
  );
}

function dedupeCards(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  const seen = new Set<string>();
  const result: LeagueInsightCard[] = [];
  for (const card of cards) {
    const key = insightKey(card);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(card);
  }
  return result;
}

function filterByTeam(cards: LeagueInsightCard[], teamId: string): LeagueInsightCard[] {
  const normalized = teamId.toUpperCase();
  return cards.filter((card) => card.teamAbbr?.toUpperCase() === normalized);
}

export function queryInsights(
  payload: InsightsPayload,
  options: InsightsQueryOptions = {},
): InsightsQueryResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const generatedAt = payload.generatedAt ?? null;

  if (options.teamId) {
    const pool = filterOverviewInsightCards([
      ...(payload.topStories ?? []),
      ...(payload.cards ?? []),
    ]);
    const filtered = sortBySignificance(dedupeCards(filterByTeam(pool, options.teamId)));
    return {
      insights: filtered.slice(0, limit),
      status: payload.topStoriesStatus ?? "generated",
      generatedAt,
    };
  }

  const stories = filterOverviewInsightCards(
    Array.isArray(payload.topStories) && payload.topStories.length > 0
      ? payload.topStories
      : (payload.cards?.slice(0, limit) ?? []),
  );

  if (stories.length === 0) {
    return {
      insights: EVERGREEN_TOP_STORIES.slice(0, limit),
      status: "fallback",
      generatedAt,
    };
  }

  return {
    insights: stories.slice(0, limit),
    status: payload.topStoriesStatus ?? "generated",
    generatedAt,
  };
}

export function loadInsightsBundle(options: InsightsQueryOptions = {}): InsightsQueryResult {
  return queryInsights(bundledPayload(), options);
}

export function loadOverviewInsightCards(): LeagueInsightCard[] {
  const cards = bundledPayload().cards;
  if (Array.isArray(cards) && cards.length > 0) {
    return filterOverviewInsightCards(cards);
  }
  return [];
}
