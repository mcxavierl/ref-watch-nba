import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildIntelligenceFeedCards } from "@/lib/homepage-intelligence";
import { semanticBadgeSurfaceClass } from "@/lib/semantic-badge-colors";

type OverviewIntelligenceFeedProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceFeed({ data }: OverviewIntelligenceFeedProps) {
  const cards = buildIntelligenceFeedCards(data, 6);
  if (cards.length === 0) return null;

  return (
    <section
      className="overview-intelligence-feed section-block overview-section--secondary"
      aria-labelledby="overview-intelligence-feed-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <div className="overview-intelligence-feed-header">
          <h2 className="overview-section-title" id="overview-intelligence-feed-heading">
            Live Intelligence Feed
          </h2>
          <span
            className={`overview-intelligence-feed-badge ${semanticBadgeSurfaceClass("baseline")}`}
          >
            Real-time
          </span>
        </div>
        <p className="overview-section-lead">
          Gate-qualified ref×team splits and crew effects updating as slates publish.
        </p>
      </div>

      <div className="overview-intelligence-feed-grid">
        {cards.map((card, index) => (
          <InsightCard
            key={`${card.leagueId}-feed-${card.refSlug ?? index}`}
            card={card}
            variant="trend"
            index={index}
            showHubLink={false}
          />
        ))}
      </div>
    </section>
  );
}
