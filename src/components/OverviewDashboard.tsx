import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import {
  buildDatasetMoatMetrics,
  buildHomepageIntelligenceTickerItems,
  buildTodaysBiggestEdgeView,
  buildTopStatisticalSignalCards,
} from "@/lib/homepage-dual-narrative";
import { IntelligenceFeedTicker } from "@/components/dashboard/IntelligenceFeedTicker";
import { TheDatasetMoat } from "@/components/dashboard/TheDatasetMoat";
import { TodaysBiggestEdge } from "@/components/dashboard/TodaysBiggestEdge";
import { TopStatisticalSignals } from "@/components/dashboard/TopStatisticalSignals";
import { UpcomingGamesGrid } from "@/components/dashboard/UpcomingGamesGrid";
import { WhyRefWatchExplainability } from "@/components/dashboard/WhyRefWatchExplainability";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import "@/components/dashboard/homepage-dual-narrative.css";
import "@/components/overview-dashboard.css";
import "@/components/overview-clinical-modern.css";

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
};

function TodaysBiggestEdgeFallback() {
  return (
    <section className="todays-biggest-edge section-block" aria-labelledby="todays-biggest-edge-heading">
      <div className="todays-biggest-edge-badge">
        <span className="todays-biggest-edge-status" aria-hidden />
        <span>Live Intelligence • Today&apos;s Biggest Edge</span>
      </div>
      <h1 className="todays-biggest-edge-matchup" id="todays-biggest-edge-heading">
        Slate intelligence loading
      </h1>
      <p className="todays-biggest-edge-league">
        Crew assignments and evidence projections publish as tonight&apos;s slate locks.
      </p>
    </section>
  );
}

export function OverviewDashboard({ data }: OverviewDashboardProps) {
  const edge = buildTodaysBiggestEdgeView(data);
  const tickerItems = buildHomepageIntelligenceTickerItems(data);
  const signalCards = buildTopStatisticalSignalCards(data);
  const datasetMetrics = buildDatasetMoatMetrics(data);

  return (
    <DashboardShell>
      {edge ? <TodaysBiggestEdge edge={edge} /> : <TodaysBiggestEdgeFallback />}

      <IntelligenceFeedTicker items={tickerItems} />

      <UpcomingGamesGrid data={data} />

      <TopStatisticalSignals cards={signalCards} />

      <WhyRefWatchExplainability />

      <TheDatasetMoat metrics={datasetMetrics} />
    </DashboardShell>
  );
}
