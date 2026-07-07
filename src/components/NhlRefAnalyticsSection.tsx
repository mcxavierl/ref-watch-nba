import { TermHelp } from "@/components/TermHelp";
import { formatPct } from "@/lib/nhl/data";
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
}: {
  analytics: NhlRefAnalytics;
  leagueAvgMinors?: number;
  leagueOvertimeRate?: number;
}) {
  const leagueMinors = leagueAvgMinors ?? 5.5;
  const leagueOt = leagueOvertimeRate ?? 0.23;

  return (
    <section className="data-card mt-6">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-zinc-800">
          <TermHelp id="nhl-ref-analytics">Whistle analytics</TermHelp>
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Referee-only sample — linesmen excluded from minor and balance metrics.
        </p>
      </div>
      <dl className="stat-row">
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="minors-per-game">Minors per game</TermHelp>
          </dt>
          <dd className="stat-value">{analytics.avgMinorsPerGame}</dd>
          <dd className="stat-detail">
            {analytics.minorsDelta >= 0 ? "+" : ""}
            {analytics.minorsDelta} vs {leagueMinors} league
          </dd>
        </div>
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="ot-rate">OT rate</TermHelp>
          </dt>
          <dd className="stat-value">{formatPct(analytics.overtimeRate)}</dd>
          <dd className="stat-detail">
            {analytics.overtimeGames} OT/SO · league {formatPct(leagueOt)}
          </dd>
        </div>
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="penalty-balance">Penalty balance</TermHelp>
          </dt>
          <dd className="stat-value capitalize">{analytics.balanceKind}</dd>
          <dd className="stat-detail">
            {formatPct(analytics.balancedGameRate)} within ±1 minor · avg gap{" "}
            {analytics.avgMinorImbalance}
          </dd>
        </div>
      </dl>
      <p className="border-t border-border-subtle px-4 py-3 text-sm text-zinc-600 sm:px-5">
        {balanceCopy[analytics.balanceKind]}
      </p>
    </section>
  );
}
