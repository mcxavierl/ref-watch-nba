import type { ReactNode } from "react";
import { RefProfileDepthExpand } from "@/components/ref-profile/RefProfileDepthExpand";
import { RefProfileOfficiatingBiasSection } from "@/components/ref-profile/RefProfileOfficiatingBiasSection";
import { RefProfileMarketImpactPanel } from "@/components/ref-profile/RefProfileMarketImpactPanel";
import {
  ScoutingReportDepth,
  ScoutingReportEdge,
} from "@/components/ref-profile/ScoutingReport";
import { RefProfileTeamTrends } from "@/components/ref-profile/RefProfileTeamTrends";
import { RefProfileCareerEvolution } from "@/components/ref-profile/RefProfile";
import { RefStatGrid } from "@/components/RefStatGrid";
import { buildRefTeamPerformanceTrends } from "@/lib/ref-team-performance-trends";
import type { CloseGameMetrics } from "@/lib/close-game";
import type { LeagueId } from "@/lib/leagues";
import type { RefGsniMetrics } from "@/lib/ref-gsni";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type CloseGameLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA";

type StatGridLabels = {
  foulLabel?: string;
  scoreLabel?: string;
  overLabel?: string;
};

/** Four-row narrative layout: edge-first on mobile, depth behind expand toggle. */
export function RefProfileNarrativeLayout({
  leagueId,
  profile,
  stats,
  qualified,
  gsniMetrics,
  closeGameMetrics,
  closeGameLeague,
  whistleAnalytics,
  showBettingProfile,
  statGridLabels,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
  gsniMetrics?: RefGsniMetrics | null;
  closeGameMetrics: CloseGameMetrics[];
  closeGameLeague: CloseGameLeague;
  whistleAnalytics?: ReactNode;
  showBettingProfile: boolean;
  statGridLabels?: StatGridLabels;
}) {
  const teamTrends = buildRefTeamPerformanceTrends(profile);
  const hideWhistleMetrics = Boolean(
    profile.nflAnalytics ||
      profile.nhlAnalytics ||
      profile.cfbAnalytics ||
      profile.eplAnalytics ||
      whistleAnalytics,
  );

  const scoutingProps = {
    leagueId,
    profile,
    stats,
    qualified,
  };

  const marketImpactPanel =
    showBettingProfile && profile.bettingStats ? (
      <RefProfileMarketImpactPanel
        profile={profile}
        stats={profile.bettingStats}
        leagueId={leagueId}
        showMetrics={qualified}
        hideWhistleMetrics={hideWhistleMetrics}
      />
    ) : (
      <section
        className="ref-profile-section ref-market-impact"
        aria-labelledby="ref-market-impact-fallback-title"
      >
        <div className="ref-table-section-header">
          <h2 id="ref-market-impact-fallback-title" className="ref-profile-section-title m-0">
            Market Impact
          </h2>
        </div>
        <div className="ref-table-section-body">
          <RefStatGrid
            profile={profile}
            overBaseline={stats.meta.leagueOverBaseline}
            foulLabel={statGridLabels?.foulLabel}
            scoreLabel={statGridLabels?.scoreLabel}
            overLabel={statGridLabels?.overLabel}
            showMetrics={qualified}
          />
        </div>
      </section>
    );

  return (
    <div className="ref-narrative-layout">
      <div className="ref-profile-primary-grid">
        <div className="ref-profile-intelligence-panel">
          <ScoutingReportEdge {...scoutingProps} />

          <RefProfileCareerEvolution profile={profile} />

          <RefProfileDepthExpand label="Expand officiating and market depth">
            <RefProfileOfficiatingBiasSection
              profile={profile}
              leagueId={leagueId}
              stats={stats}
              qualified={qualified}
              gsniMetrics={gsniMetrics}
              closeGameMetrics={closeGameMetrics}
              closeGameLeague={closeGameLeague}
              whistleAnalytics={whistleAnalytics}
            />

            <ScoutingReportDepth {...scoutingProps} />

            <RefProfileTeamTrends best={teamTrends.best} worst={teamTrends.worst} leagueId={leagueId} />
          </RefProfileDepthExpand>
        </div>

        <div className="ref-profile-market-panel">{marketImpactPanel}</div>
      </div>
    </div>
  );
}
