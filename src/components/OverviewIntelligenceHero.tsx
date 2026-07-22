import { DailyBriefingBanner } from "@/components/DailyBriefingBanner";
import { GoldMineProofBar } from "@/components/GoldMineProofBar";
import { IntelligenceHero } from "@/components/dashboard/IntelligenceHero";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildDatasetMoatMetrics } from "@/lib/homepage-dual-narrative";
import { countRefAnomalyAlerts } from "@/lib/homepage-intelligence";

type OverviewIntelligenceHeroProps = {
  data: CrossLeagueOverview;
};

export function OverviewIntelligenceHero({ data }: OverviewIntelligenceHeroProps) {
  const metrics = buildDatasetMoatMetrics(data);
  const matchupCount = data.upcomingSlate.totalGames + data.upcomingSlate.totalScheduled;

  return (
    <div className="overview-intelligence-hero">
      <IntelligenceHero />
      <GoldMineProofBar metrics={metrics} />
      <DailyBriefingBanner
        matchupCount={matchupCount}
        liveLeagueCount={data.liveLeagueCount}
        anomalyCount={countRefAnomalyAlerts()}
      />
    </div>
  );
}
