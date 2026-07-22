import { GoldMineProofBar } from "@/components/GoldMineProofBar";
import { IntelligenceHero } from "@/components/dashboard/IntelligenceHero";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildDatasetMoatMetrics } from "@/lib/homepage-dual-narrative";

type OverviewIntelligenceHeroProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceHero({ data }: OverviewIntelligenceHeroProps) {
  const metrics = buildDatasetMoatMetrics(data);

  return (
    <div className="overview-intelligence-hero space-y-4">
      <IntelligenceHero />
      <GoldMineProofBar metrics={metrics} />
    </div>
  );
}
