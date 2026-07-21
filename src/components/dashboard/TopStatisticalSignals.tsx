import { InsightCard } from "@/components/shared/InsightCard";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { insightCardKey } from "@/lib/insight-editorial";
import "./homepage-dual-narrative.css";

type TopStatisticalSignalsProps = {
  cards: LeagueInsightCard[];
};

export function TopStatisticalSignals({ cards }: TopStatisticalSignalsProps) {
  if (cards.length === 0) return null;

  return (
    <section
      className="overview-editorial-section section-block"
      aria-labelledby="top-statistical-signals-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <h2 className="overview-section-title" id="top-statistical-signals-heading">
          Top statistical signals
        </h2>
        <p className="overview-section-lead">
          Gate-qualified splits ranked by statistical significance and sample depth.
        </p>
      </div>

      <div className="top-statistical-signals-grid">
        {cards.map((card, index) => (
          <InsightCard
            key={insightCardKey(card)}
            card={card}
            variant="trend"
            index={index}
            showHubLink
          />
        ))}
      </div>
    </section>
  );
}
