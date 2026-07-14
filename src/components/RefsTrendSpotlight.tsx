"use client";

import { InsightCard } from "@/components/shared/InsightCard";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

type RefsTrendSpotlightProps = {
  cards: LeagueInsightCard[];
  tabLabel: string;
};

export function RefsTrendSpotlight({ cards, tabLabel }: RefsTrendSpotlightProps) {
  if (cards.length === 0) return null;

  return (
    <section className="refs-trend-spotlight" aria-label="Trend spotlight">
      <header className="refs-trend-spotlight-head">
        <h2 className="refs-trend-spotlight-title">Trend Spotlight</h2>
        <p className="refs-trend-spotlight-lead">
          Top {cards.length} officials by {tabLabel.toLowerCase()}
        </p>
      </header>
      <div className="refs-trend-spotlight-track">
        {cards.map((card, index) => (
          <InsightCard
            key={`${card.refSlug ?? card.entityName}-${index}`}
            card={card}
            variant="inline"
            index={index}
            className="refs-trend-spotlight-card"
          />
        ))}
      </div>
    </section>
  );
}
