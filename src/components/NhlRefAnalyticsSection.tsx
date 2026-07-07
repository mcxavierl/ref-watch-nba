import { TermHelp } from "@/components/TermHelp";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";
import { formatPct } from "@/lib/nhl/data";
import { formatSigned } from "@/lib/stats-utils";
import type { NhlRefAnalytics } from "@/lib/types";

const balanceCopy = {
  balancer: "Tends to finish with even minor-penalty counts between teams.",
  asymmetric: "More often ends with a lopsided minor-penalty split.",
  neutral: "Penalty balance sits near league norms.",
};

export function NhlRefAnalyticsSection({
  analytics,
  leagueAvgMinors,
  leagueOvertimeRate,
  showMetrics = true,
}: {
  analytics: NhlRefAnalytics;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
  showMetrics?: boolean;
}) {
  const leagueMinors = leagueAvgMinors ?? 5.5;
  const leagueOt = leagueOvertimeRate ?? 0.23;
  const prov = analytics.provenance;

  return (
    <section className="data-card">
      <div className="ref-table-section-header">
        <h2 className="text-sm font-semibold text-zinc-800">
          <TermHelp id="nhl-ref-analytics">Whistle analytics</TermHelp>
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Referee-only sample; linesmen excluded from minor and balance metrics.
        </p>
      </div>
      {!showMetrics ? (
        <p className="px-4 py-6 text-sm text-zinc-600 sm:px-5">
          Whistle analytics appear after this official clears the sample gate.
        </p>
      ) : (
        <>
          <div className="px-4 py-4 sm:px-5">
            <RefDashboardStatGrid>
              <RefDashboardStatCell
                label={<TermHelp id="minors-per-game">Minors per game</TermHelp>}
                value={String(analytics.avgMinorsPerGame)}
                detail={`${formatSigned(analytics.minorsDelta)} vs ${leagueMinors} league`}
                provenance={prov?.avgMinorsPerGame}
              />
              <RefDashboardStatCell
                label={<TermHelp id="ot-rate">OT rate</TermHelp>}
                value={formatPct(analytics.overtimeRate)}
                detail={`${analytics.overtimeGames} OT/SO · league ${formatPct(leagueOt)}`}
                provenance={prov?.overtimeRate}
              />
              <RefDashboardStatCell
                label={<TermHelp id="penalty-balance">Penalty balance</TermHelp>}
                value={analytics.balanceKind}
                detail={`${formatPct(analytics.balancedGameRate)} within ±1 minor · avg gap ${analytics.avgMinorImbalance}`}
                provenance={prov?.penaltyBalance}
              />
            </RefDashboardStatGrid>
          </div>
          <p className="border-t border-border-subtle px-4 py-3 text-sm text-zinc-600 sm:px-5">
            {balanceCopy[analytics.balanceKind]}
          </p>
        </>
      )}
    </section>
  );
}
