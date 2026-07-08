import { TermHelp } from "@/components/TermHelp";
import { RefDashboardStatCell, RefDashboardStatGrid } from "@/components/RefDashboardStatGrid";
import { formatPct } from "@/lib/nfl/data";
import { formatSigned } from "@/lib/stats-utils";
import type { NflRefAnalytics } from "@/lib/types";

export function NflRefAnalyticsSection({ analytics, leagueAvgFouls, leagueAvgPenaltyYards, showMetrics = true }: { analytics: NflRefAnalytics; leagueAvgFouls?: number; leagueAvgPenaltyYards?: number; showMetrics?: boolean }) {
  const lf = leagueAvgFouls ?? 13;
  const ly = leagueAvgPenaltyYards ?? 95;
  const prov = analytics.provenance;
  return (
    <section className="data-card">
      <div className="ref-table-section-header"><h2 className="text-sm font-semibold text-zinc-800"><TermHelp id="nfl-ref-analytics">Whistle analytics</TermHelp></h2></div>
      {!showMetrics ? <p className="px-4 py-6 text-sm text-zinc-600">Sample gate not cleared.</p> : (
        <div className="px-4 py-4 sm:px-5"><RefDashboardStatGrid>
          <RefDashboardStatCell label="Flags per game" value={String(analytics.avgFlagsPerGame)} detail={`${formatSigned(analytics.flagsDelta)} vs ${lf}`} provenance={prov?.avgFlagsPerGame} />
          <RefDashboardStatCell label="Penalty yards" value={String(analytics.avgPenaltyYardsPerGame)} detail={`${formatSigned(analytics.penaltyYardsDelta)} vs ${ly}`} provenance={prov?.penaltyYards} />
          <RefDashboardStatCell label="Balance" value={analytics.balanceKind} detail={formatPct(analytics.balancedGameRate)} provenance={prov?.penaltyBalance} />
        </RefDashboardStatGrid></div>
      )}
    </section>
  );
}
