"use client";

import { useMemo } from "react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { pickTopInsightCard, trendInsightCards } from "@/lib/insight-editorial";

type OverviewEditorialNarrativeProps = {
  insightCards: CrossLeagueOverview["insightCards"];
  topStories: CrossLeagueOverview["topStories"];
};

function dedupeInsightPool(
  insightCards: CrossLeagueOverview["insightCards"],
  topStories: CrossLeagueOverview["topStories"],
) {
  const seen = new Set<string>();
  const pool = [...topStories, ...insightCards];
  return pool.filter((card) => {
    const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function OverviewEditorialNarrative({
  insightCards,
  topStories,
}: OverviewEditorialNarrativeProps) {
  const pool = useMemo(
    () => dedupeInsightPool(insightCards, topStories),
    [insightCards, topStories],
  );

  const topInsightCard = useMemo(() => pickTopInsightCard(pool), [pool]);
  const trendCards = useMemo(() => trendInsightCards(insightCards), [insightCards]);

  if (!topInsightCard && trendCards.length === 0) {
    return null;
  }

  return (
    <div className="overview-editorial-narrative">
      {topInsightCard ? (
        <section
          className="overview-editorial-section overview-editorial-section--featured section-block"
          aria-labelledby="overview-top-insight-heading"
        >
          <div className="overview-section-header overview-section-header--primary">
            <h2 className="overview-section-title" id="overview-top-insight-heading">
              Top verified whistle edge
            </h2>
            <p className="overview-section-lead">
              The strongest verified whistle edge across live leagues right now.
            </p>
          </div>
          <InsightCard card={topInsightCard} variant="featured" />
        </section>
      ) : null}

      {trendCards.length > 0 ? (
        <section
          className="overview-editorial-section overview-editorial-section--trends section-block overview-section--secondary"
          aria-labelledby="overview-trends-heading"
        >
          <div className="overview-section-header overview-section-header--compact">
            <h2 className="overview-section-title" id="overview-trends-heading">
              Standout splits by league
            </h2>
            <p className="overview-section-lead">
              One verified ref×team or whistle edge per live league.
            </p>
          </div>
          <div className="overview-editorial-trends-grid">
            {trendCards.map((card, index) => (
              <InsightCard key={`${card.leagueId}-trend`} card={card} variant="trend" index={index} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
