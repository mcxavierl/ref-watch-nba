"use client";

import { useMemo } from "react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { quickInsightCards } from "@/lib/insight-editorial";

type OverviewQuickInsightsProps = {
  insightCards: CrossLeagueOverview["insightCards"];
  topStories: CrossLeagueOverview["topStories"];
  topFindingCards?: CrossLeagueOverview["topFindingCards"];
};

export function OverviewQuickInsights({
  insightCards,
  topStories,
  topFindingCards = [],
}: OverviewQuickInsightsProps) {
  const cards = useMemo(
    () => {
      const seen = new Set<string>();
      const pool = [...topFindingCards, ...topStories, ...insightCards].filter((card) => {
        const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return quickInsightCards(pool, 3);
    },
    [insightCards, topFindingCards, topStories],
  );

  if (cards.length === 0) return null;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--quick section-block overview-section--secondary"
      aria-labelledby="overview-quick-insights-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <h2 className="overview-section-title" id="overview-quick-insights-heading">
          Quick insights
        </h2>
        <p className="overview-section-lead">
          Top dataset signals across leagues - compact cards before you open a hub.
        </p>
      </div>
      <div className="overview-editorial-quick-grid">
        {cards.map((card, index) => (
          <InsightCard
            key={`${card.leagueId}-quick-${card.refSlug ?? index}`}
            card={card}
            variant="quick"
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
