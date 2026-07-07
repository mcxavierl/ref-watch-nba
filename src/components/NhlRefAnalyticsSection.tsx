import { TermHelp } from "@/components/TermHelp";
import { ProvenanceMarker, provenanceValueClass } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";
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
  const prov = analytics.provenance;

  return (
    <section className="data-card mt-6">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-800">
            <TermHelp id="nhl-ref-analytics">Whistle analytics</TermHelp>
          </h2>
          {prov && <SampleGateBadge gate={prov.sampleGate} />}
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Referee-only sample — linesmen excluded from minor and balance metrics.
        </p>
      </div>
      <dl className="stat-row">
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="minors-per-game">Minors per game</TermHelp>
            {prov && (
              <span className="ml-1">
                <ProvenanceMarker provenance={prov.avgMinorsPerGame} compact />
              </span>
            )}
          </dt>
          <dd
            className={`stat-value ${provenanceValueClass(prov?.avgMinorsPerGame) ?? ""}`.trim()}
          >
            {analytics.avgMinorsPerGame}
          </dd>
          <dd className="stat-detail">
            {analytics.minorsDelta >= 0 ? "+" : ""}
            {analytics.minorsDelta} vs {leagueMinors} league
          </dd>
        </div>
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="ot-rate">OT rate</TermHelp>
            {prov && (
              <span className="ml-1">
                <ProvenanceMarker provenance={prov.overtimeRate} compact />
              </span>
            )}
          </dt>
          <dd
            className={`stat-value ${provenanceValueClass(prov?.overtimeRate) ?? ""}`.trim()}
          >
            {formatPct(analytics.overtimeRate)}
          </dd>
          <dd className="stat-detail">
            {analytics.overtimeGames} OT/SO · league {formatPct(leagueOt)}
          </dd>
        </div>
        <div className="stat-cell">
          <dt className="stat-label">
            <TermHelp id="penalty-balance">Penalty balance</TermHelp>
            {prov && (
              <span className="ml-1">
                <ProvenanceMarker provenance={prov.penaltyBalance} compact />
              </span>
            )}
          </dt>
          <dd
            className={`stat-value capitalize ${provenanceValueClass(prov?.penaltyBalance) ?? ""}`.trim()}
          >
            {analytics.balanceKind}
          </dd>
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
