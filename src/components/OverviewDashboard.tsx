import type { ReactNode } from "react";
import { GoldMineProofBar } from "@/components/GoldMineProofBar";
import { OverviewFeaturedSignal } from "@/components/OverviewFeaturedSignal";
import { OverviewResearchFooter } from "@/components/OverviewResearchFooter";
import { OverviewUpcomingSlateSection } from "@/components/OverviewUpcomingSlateSection";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import "@/components/overview-dashboard.css";
import "@/components/overview-clinical-modern.css";
import "@/components/overview-intelligence-hero.css";

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
  hero: ReactNode;
  exploreTabs: ReactNode;
};

export function OverviewDashboard({
  data,
  hero,
  exploreTabs,
}: OverviewDashboardProps) {
  return (
    <DashboardShell>
      {hero}

      <GoldMineProofBar data={data} />

      <OverviewFeaturedSignal data={data} />

      <OverviewUpcomingSlateSection data={data} />

      <OverviewResearchFooter data={data} exploreTabs={exploreTabs} />
    </DashboardShell>
  );
}
