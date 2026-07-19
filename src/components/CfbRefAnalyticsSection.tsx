import { TermHelp } from "@/components/TermHelp";
import { RefDashboardStatCell, RefDashboardStatGrid } from "@/components/RefDashboardStatGrid";
import { formatPct } from "@/lib/cfb/data";
import { formatSigned } from "@/lib/stats-utils";
import type { CfbRefAnalytics } from "@/lib/types";

export function CfbRefAnalyticsSection({
  analytics,
  leagueAvgFouls,
  leagueAvgPenaltyYards,
  showMetrics = true,
  embedded = false,
}: {
  analytics: CfbRefAnalytics;
  leagueAvgFouls?: number;
  leagueAvgPenaltyYards?: number;
  showMetrics?: boolean;
  embedded?: boolean;
}) {
  const lf = leagueAvgFouls ?? 10;
  const ly = leagueAvgPenaltyYards ?? 60;
  const prov = analytics.provenance;

  const content = !showMetrics ? (
    <p className="text-sm font-normal text-slate-400">Sample gate not cleared.</p>
  ) : (
    <RefDashboardStatGrid>
      <RefDashboardStatCell
        label="Flags per game"
        value={String(analytics.avgFlagsPerGame)}
        detail={`${formatSigned(analytics.flagsDelta)} vs ${lf} avg`}
        provenance={prov?.avgFlagsPerGame}
      />
      <RefDashboardStatCell
        label="Penalty yards"
        value={String(analytics.avgPenaltyYardsPerGame)}
        detail={`${formatSigned(analytics.penaltyYardsDelta)} vs ${ly} avg`}
        provenance={prov?.penaltyYards}
      />
      <RefDashboardStatCell
        label="Flag imbalance"
        value={String(analytics.avgFlagImbalance)}
        detail="Avg |home − away| flags"
        provenance={prov?.penaltyBalance}
      />
      <RefDashboardStatCell
        label="Balance profile"
        value={analytics.balanceKind}
        detail={`${formatPct(analytics.balancedGameRate)} within 1 flag`}
        provenance={prov?.penaltyBalance}
      />
    </RefDashboardStatGrid>
  );

  if (embedded) {
    return <div className="ref-whistle-analytics-embedded min-w-0">{content}</div>;
  }

  return (
    <section className="ref-profile-section">
      <div className="ref-table-section-header">
        <h2 className="font-semibold tracking-tight">
          <TermHelp id="nfl-ref-analytics">Whistle analytics</TermHelp>
        </h2>
      </div>
      <div className="ref-table-section-body">{content}</div>
    </section>
  );
}
