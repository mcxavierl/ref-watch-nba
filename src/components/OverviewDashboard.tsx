import type { ReactNode } from "react";
import { OverviewResearchFooter } from "@/components/OverviewResearchFooter";
import { OverviewUpcomingSlateSection } from "@/components/OverviewUpcomingSlateSection";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import "@/components/overview-dashboard.css";
import "@/components/overview-clinical-modern.css";
import "@/components/slate-intelligence.css";
import "@/components/overview-intelligence-hero.css";

type OverviewDashboardProps = {
  data: CrossLeagueOverview;
  historicalSeedGames?: OverviewSlateEntry[];
  hero: ReactNode;
  exploreTabs: ReactNode;
};

export function OverviewDashboard({
  data,
  historicalSeedGames,
  hero,
  exploreTabs,
}: OverviewDashboardProps) {
  return (
    <DashboardShell>
      <div className="overview-homepage-stack">
        {hero}

        <OverviewUpcomingSlateSection
          data={data}
          historicalSeedGames={historicalSeedGames}
        />

        <OverviewResearchFooter data={data} exploreTabs={exploreTabs} />
      </div>
    </DashboardShell>
  );
}
