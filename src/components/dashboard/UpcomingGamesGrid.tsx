import { OverviewUpcomingSlateSection } from "@/components/OverviewUpcomingSlateSection";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type UpcomingGamesGridProps = {
  data: CrossLeagueOverview;
};

/** Upcoming slate grid with evidence teaser pills on assigned-crew cards. */
export function UpcomingGamesGrid({ data }: UpcomingGamesGridProps) {
  return <OverviewUpcomingSlateSection data={data} />;
}
