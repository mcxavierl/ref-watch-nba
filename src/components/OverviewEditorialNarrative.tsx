"use client";

import { useMemo } from "react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import {
  pickHeroInsightCard,
  spotlightInsightCards,
  trendInsightCards,
} from "@/lib/insight-editorial";

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

  const heroCard = useMemo(() => pickHeroInsightCard(pool), [pool]);
  const trendCards = useMemo(() => trendInsightCards(insightCards), [insightCards]);
  const spotlightCards = useMemo(
    () => spotlightInsightCards(heroCard, topStories.length > 0 ? topStories : pool, 3),
    [heroCard, pool, topStories],
  );

  if (!heroCard && trendCards.length === 0 && spotlightCards.length === 0) {
    return null;
  }

  return (
    <div className="overview-editorial-narrative">
      {heroCard ? (
        <section
          className="overview-editorial-section overview-editorial-section--hero section-block"
          aria-labelledby="overview-hero-insight-heading"
        >
          <div className="overview-section-header overview-section-header--primary">
            <h2 className="overview-section-title" id="overview-hero-insight-heading">
              Hero insight
            </h2>
            <p className="overview-section-lead">
              The strongest verified whistle edge across live leagues right now.
            </p>
          </div>
          <InsightCard card={heroCard} variant="hero" />
        </section>
      ) : null}

      {trendCards.length > 0 ? (
        <section
          className="overview-editorial-section overview-editorial-section--trends section-block overview-section--secondary"
          aria-labelledby="overview-trends-heading"
        >
          <div className="overview-section-header overview-section-header--compact">
            <h2 className="overview-section-title" id="overview-trends-heading">
              What changed this season
            </h2>
            <p className="overview-section-lead">
              One trend per league - medium cards with the headline split first.
            </p>
          </div>
          <div className="overview-editorial-trends-grid">
            {trendCards.map((card, index) => (
              <InsightCard key={`${card.leagueId}-trend`} card={card} variant="trend" index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {spotlightCards.length > 0 ? (
        <section
          className="overview-editorial-section overview-editorial-section--spotlight section-block overview-section--secondary"
          aria-labelledby="overview-spotlight-heading"
        >
          <div className="overview-section-header overview-section-header--compact">
            <h2 className="overview-section-title" id="overview-spotlight-heading">
              Crew spotlight
            </h2>
            <p className="overview-section-lead">
              Officials driving the next layer of story beyond the hero card.
            </p>
          </div>
          <div className="overview-editorial-spotlight-grid">
            {spotlightCards.map((card, index) => (
              <InsightCard
                key={`${card.leagueId}-spotlight-${card.refSlug ?? index}`}
                card={card}
                variant="trend"
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
