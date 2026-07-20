import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { insightCardKey } from "@/lib/insight-editorial";
import { HOMEPAGE_METHODOLOGY_BLURB } from "@/lib/homepage-insight-gates";

type OverviewEditorialNarrativeProps = {
  trendCards: CrossLeagueOverview["standoutSplitCards"];
};

export function OverviewEditorialNarrative({
  trendCards,
}: OverviewEditorialNarrativeProps) {
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
            {HOMEPAGE_METHODOLOGY_BLURB}
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
