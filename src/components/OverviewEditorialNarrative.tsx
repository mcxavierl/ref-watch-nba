"use client";

import { useMemo } from "react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import {
  insightCardKey,
  overviewStandoutSplitCards,
} from "@/lib/insight-editorial";

type OverviewEditorialNarrativeProps = {
  insightCards: CrossLeagueOverview["insightCards"];
};

export function OverviewEditorialNarrative({
  insightCards,
}: OverviewEditorialNarrativeProps) {
  const trendCards = useMemo(
    () => overviewStandoutSplitCards(insightCards, null),
    [insightCards],
  );

  if (trendCards.length === 0) {
    return null;
  }

  return (
    <div className="overview-editorial-narrative">
      <section
        className="overview-editorial-section overview-editorial-section--trends section-block overview-section--secondary"
        aria-labelledby="overview-trends-heading"
      >
        <div className="overview-section-header overview-section-header--compact">
          <h2 className="overview-section-title" id="overview-trends-heading">
            Standout splits by league
          </h2>
          <p className="overview-section-lead">
            One verified ref×team split per live league, plus deeper NBA, NFL, and EPL samples.
          </p>
        </div>
        <div className="overview-editorial-trends-grid">
          {trendCards.map((card, index) => (
            <InsightCard
              key={insightCardKey(card)}
              card={card}
              variant="trend"
              index={index}
              showHubLink={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
