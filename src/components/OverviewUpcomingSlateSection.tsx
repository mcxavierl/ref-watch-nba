import { LiveSlateGrid } from "@/components/LiveSlateGrid";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { HOMEPAGE_SLATE_GRID_SIZE } from "@/lib/overview-slate-shared";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

type OverviewUpcomingSlateSectionProps = {
  data: CrossLeagueOverview;
  historicalSeedGames?: OverviewSlateEntry[];
};

export function OverviewUpcomingSlateSection({
  data,
  historicalSeedGames,
}: OverviewUpcomingSlateSectionProps) {
  const { upcomingSlate } = data;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--slate section-block"
      aria-labelledby="overview-upcoming-heading"
    >
      <h2 id="overview-upcoming-heading" className="sr-only">
        Today&apos;s officiating outlook
      </h2>

      <LiveSlateGrid
        initialSlate={{
          ...upcomingSlate,
          fetchedAt: upcomingSlate.lastUpdated ?? new Date().toISOString(),
        }}
        initialGames={upcomingSlate.games}
        historicalSeedGames={historicalSeedGames}
        limit={HOMEPAGE_SLATE_GRID_SIZE}
        matchupLabel="matchup"
        showOutlookBanner
      />
    </section>
  );
}
