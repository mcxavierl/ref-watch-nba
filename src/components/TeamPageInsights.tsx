"use client";

import { InsightCard } from "@/components/shared/InsightCard";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import "@/components/overview-dashboard.css";

type TeamPageInsightsProps = {
  cards: LeagueInsightCard[];
  teamLabel: string;
};

export function TeamPageInsights({ cards, teamLabel }: TeamPageInsightsProps) {
  if (cards.length === 0) return null;

  const [featured, ...supporting] = cards;

  return (
    <div className="overview-editorial-narrative">
      {featured ? (
        <section
          className="overview-editorial-section overview-editorial-section--featured section-block"
          aria-labelledby="team-top-insight-heading"
        >
          <div className="overview-section-header overview-section-header--primary">
            <h2 className="overview-section-title" id="team-top-insight-heading">
              Top verified whistle edge
            </h2>
            <p className="overview-section-lead">
              The strongest verified ref pattern for {teamLabel} in the current sample.
            </p>
          </div>
          <InsightCard card={featured} variant="featured" />
        </section>
      ) : null}

      {supporting.length > 0 ? (
        <section
          className="overview-editorial-section overview-editorial-section--trends section-block overview-section--secondary"
          aria-labelledby="team-supporting-insights-heading"
        >
          <div className="overview-section-header overview-section-header--compact">
            <h2 className="overview-section-title" id="team-supporting-insights-heading">
              More verified patterns
            </h2>
            <p className="overview-section-lead">
              Whistle and league patterns that complement the ref split table below.
            </p>
          </div>
          <div className="overview-editorial-trends-grid">
            {supporting.map((card, index) => (
              <InsightCard
                key={`${card.leagueId}-${card.refSlug ?? card.headline}-${index}`}
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
