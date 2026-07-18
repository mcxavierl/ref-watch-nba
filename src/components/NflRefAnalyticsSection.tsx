import { TermHelp } from "@/components/TermHelp";
import { RefDashboardStatCell, RefDashboardStatGrid } from "@/components/RefDashboardStatGrid";
import { RefereeWhistleMetricToggle } from "@/components/RefereeWhistleMetricToggle";
import { formatPct } from "@/lib/nfl/data";
import {
  resolvePenaltyShrinkageSampleN,
  shrinkNflAnalyticsDisplay,
} from "@/lib/nfl/penalty-shrinkage";
import { formatSigned } from "@/lib/stats-utils";
import type { NflRefAnalytics, RefProfile } from "@/lib/types";

function roundDisplay(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function NflRefAnalyticsSection({
  analytics,
  leagueAvgFouls,
  leagueAvgPenaltyYards,
  showMetrics = true,
  profile,
}: {
  analytics: NflRefAnalytics;
  leagueAvgFouls?: number;
  leagueAvgPenaltyYards?: number;
  showMetrics?: boolean;
  profile?: Pick<RefProfile, "gsniHighLeverageMinutes" | "games">;
}) {
  const lf = leagueAvgFouls ?? 13;
  const ly = leagueAvgPenaltyYards ?? 95;
  const prov = analytics.provenance;
  const sampleN = profile
    ? resolvePenaltyShrinkageSampleN(profile, analytics)
    : analytics.leverageSampleGames ?? 0;
  const shrunk = shrinkNflAnalyticsDisplay(analytics, sampleN, lf, ly);

  return (
    <section className="ref-profile-section">
      <div className="ref-table-section-header">
        <h2 className="font-semibold tracking-tight">
          <TermHelp id="nfl-ref-analytics">Whistle analytics</TermHelp>
        </h2>
      </div>
      {!showMetrics ? (
        <p className="ref-table-section-body text-sm font-normal text-slate-400">Sample gate not cleared.</p>
      ) : (
        <div className="ref-table-section-body">
          <RefereeWhistleMetricToggle
            analytics={analytics}
            shrunk={shrunk}
            className="mb-4"
          />
          <RefDashboardStatGrid>
            <RefDashboardStatCell
              label="Flags per game"
              value={roundDisplay(shrunk.avgFlagsPerGame.display)}
              detail={`${formatSigned(shrunk.flagsDelta.display)} vs ${lf} avg`}
              provenance={prov?.avgFlagsPerGame}
              valueTooltip={shrunk.avgFlagsPerGame.tooltip}
            />
            <RefDashboardStatCell
              label="Penalty yards"
              value={roundDisplay(shrunk.avgPenaltyYardsPerGame.display)}
              detail={`${formatSigned(shrunk.penaltyYardsDelta.display)} vs ${ly} avg`}
              provenance={prov?.penaltyYards}
              valueTooltip={shrunk.avgPenaltyYardsPerGame.tooltip}
            />
            <RefDashboardStatCell label="Flag imbalance" value={String(analytics.avgFlagImbalance)} detail="Avg |home − away| flags" provenance={prov?.penaltyBalance} />
            <RefDashboardStatCell label="Balance profile" value={analytics.balanceKind} detail={`${formatPct(analytics.balancedGameRate)} within 1 flag`} provenance={prov?.penaltyBalance} />
            {shrunk.avgHighLeverageImpactPerGame ? (
              <RefDashboardStatCell
                label="High-leverage impact"
                value={roundDisplay(shrunk.avgHighLeverageImpactPerGame.display)}
                detail={`${formatSigned(shrunk.highLeverageImpactDelta?.display ?? 0)} vs 8.2 league avg`}
                valueTooltip={shrunk.avgHighLeverageImpactPerGame.tooltip}
              />
            ) : null}
          </RefDashboardStatGrid>
        </div>
      )}
    </section>
  );
}
