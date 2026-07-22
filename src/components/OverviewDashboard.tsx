import type { ReactNode } from "react";
import { OverviewResearchFooter } from "@/components/OverviewResearchFooter";
import { OverviewUpcomingSlateSection } from "@/components/OverviewUpcomingSlateSection";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import "@/components/overview-dashboard.css";
import "@/components/overview-clinical-modern.css";
import "@/components/slate-intelligence.css";
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

      <OverviewUpcomingSlateSection data={data} />

      <OverviewResearchFooter data={data} exploreTabs={exploreTabs} />
    </DashboardShell>
  );
}
