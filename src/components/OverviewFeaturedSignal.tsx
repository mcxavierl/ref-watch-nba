import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildTopSignalView } from "@/lib/homepage-intelligence";
import { TopSignal } from "@/components/dashboard/TopSignal";

type OverviewFeaturedSignalProps = {
  data: CrossLeagueOverview;
};

export function OverviewFeaturedSignal({ data }: OverviewFeaturedSignalProps) {
  const signal = buildTopSignalView(data);
  if (!signal) return null;

  return <TopSignal signal={signal} />;
}
