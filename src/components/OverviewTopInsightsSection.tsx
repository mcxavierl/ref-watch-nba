import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildTopStatisticalSignalCards } from "@/lib/homepage-dual-narrative";
import { HOMEPAGE_METHODOLOGY_BLURB } from "@/lib/homepage-insight-gates";
import { insightCardKey } from "@/lib/insight-editorial";
import "@/components/dashboard/homepage-dual-narrative.css";

type OverviewTopInsightsSectionProps = {
  data: CrossLeagueOverview;
};

export function OverviewTopInsightsSection({ data }: OverviewTopInsightsSectionProps) {
  const cards = buildTopStatisticalSignalCards(data, 6);
  if (cards.length === 0) return null;

  return (
    <section
      className="overview-top-insights section-block"
      aria-labelledby="overview-top-insights-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <h2 className="overview-section-title" id="overview-top-insights-heading">
          Top insights across leagues
        </h2>
        <p className="overview-section-lead">
          Cross-league ref×team splits ranked by statistical significance.{" "}
          {HOMEPAGE_METHODOLOGY_BLURB}
        </p>
      </div>

      <div className="overview-top-insights-grid">
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
