import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildIntelligenceFeedEvents } from "@/lib/homepage-intelligence";
import { IntelligenceFeed } from "@/components/dashboard/IntelligenceFeed";

type OverviewIntelligenceFeedProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceFeed({ data }: OverviewIntelligenceFeedProps) {
  const events = buildIntelligenceFeedEvents(data, 12);
  return <IntelligenceFeed events={events} />;
}
