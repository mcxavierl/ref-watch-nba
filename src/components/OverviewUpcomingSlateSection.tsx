import { LiveSlateGrid } from "@/components/LiveSlateGrid";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { HOMEPAGE_SLATE_GRID_SIZE } from "@/lib/overview-slate-shared";

type OverviewUpcomingSlateSectionProps = {
  data: CrossLeagueOverview;
};

export function OverviewUpcomingSlateSection({ data }: OverviewUpcomingSlateSectionProps) {
  const { upcomingSlate } = data;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
      aria-labelledby="overview-upcoming-heading"
    >
      <div className="overview-section-header overview-section-header--primary overview-live-slate-header-wrap">
        <h2
          className="overview-live-slate-title text-xl font-semibold text-white"
          id="overview-upcoming-heading"
        >
          Live Slate
        </h2>
        <p className="overview-section-lead overview-live-slate-lead">
          Scores, crews, and assignments refresh as the slate moves.
        </p>
      </div>

      <LiveSlateGrid
        initialSlate={{
          ...upcomingSlate,
          fetchedAt: upcomingSlate.lastUpdated ?? new Date().toISOString(),
        }}
        initialGames={upcomingSlate.games}
        limit={HOMEPAGE_SLATE_GRID_SIZE}
        matchupLabel="matchup"
      />
    </section>
  );
}
