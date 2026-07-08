import { TermHelp } from "@/components/TermHelp";
import { RefDashboardStatCell, RefDashboardStatGrid } from "@/components/RefDashboardStatGrid";
import { formatSigned } from "@/lib/stats-utils";
import type { EplRefAnalytics } from "@/lib/types";

export function EplRefAnalyticsSection({
  analytics,
  leagueAvgFouls,
  leagueAvgYellowCards,
  leagueAvgRedCards,
  leagueAvgPenalties,
  showMetrics = true,
}: {
  analytics: EplRefAnalytics;
  leagueAvgFouls?: number;
  leagueAvgYellowCards?: number;
  leagueAvgRedCards?: number;
  leagueAvgPenalties?: number;
  showMetrics?: boolean;
}) {
  const lf = leagueAvgFouls ?? 22;
  const ly = leagueAvgYellowCards ?? 3.5;
  const lr = leagueAvgRedCards ?? 0.15;
  const lp = leagueAvgPenalties ?? 0.28;
  const prov = analytics.provenance;

  return (
    <section className="data-card">
      <div className="ref-table-section-header">
        <h2 className="text-sm font-semibold text-zinc-800">
          <TermHelp id="nfl-ref-analytics">Whistle analytics</TermHelp>
        </h2>
      </div>
      {!showMetrics ? (
        <p className="px-4 py-6 text-sm text-zinc-600">Sample gate not cleared.</p>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <RefDashboardStatGrid>
            <RefDashboardStatCell
              label="Goals per match"
              value={String(analytics.avgGoalsPerGame)}
              detail={`${formatSigned(analytics.goalsDelta)} vs league avg`}
              provenance={prov?.foulsBaseline}
            />
            <RefDashboardStatCell
              label="Fouls per match"
              value={String(analytics.avgFoulsPerGame)}
              detail={`${formatSigned(analytics.foulsDelta)} vs ${lf} avg`}
              provenance={prov?.avgFoulsPerGame}
            />
            <RefDashboardStatCell
              label="Yellow cards"
              value={String(analytics.avgYellowCardsPerGame)}
              detail={`${formatSigned(analytics.yellowCardsDelta)} vs ${ly} avg`}
              provenance={prov?.avgYellowCardsPerGame}
            />
            <RefDashboardStatCell
              label="Red cards"
              value={String(analytics.avgRedCardsPerGame)}
              detail={`${formatSigned(analytics.redCardsDelta)} vs ${lr} avg`}
              provenance={prov?.avgRedCardsPerGame}
            />
            <RefDashboardStatCell
              label="Penalties"
              value={String(analytics.avgPenaltiesPerGame)}
              detail={`${formatSigned(analytics.penaltiesDelta)} vs ${lp} avg`}
              provenance={prov?.avgPenaltiesPerGame}
            />
            <RefDashboardStatCell
              label="Card balance"
              value={analytics.balanceKind}
              detail={`${(analytics.balancedGameRate * 100).toFixed(0)}% within 1 card · avg imbalance ${analytics.avgCardImbalance}`}
              provenance={prov?.cardBalance}
            />
          </RefDashboardStatGrid>
        </div>
      )}
    </section>
  );
}
