"use client";

import { RefsTrendSpotlightCard } from "@/components/RefsTrendSpotlightCard";
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
      <ul className="rankings-insight-grid refs-trend-spotlight-track">
        {cards.map((card, index) => (
          <RefsTrendSpotlightCard
            key={`${card.refSlug ?? card.entityName}-${index}`}
            card={card}
          />
        ))}
      </ul>
    </section>
  );
}
