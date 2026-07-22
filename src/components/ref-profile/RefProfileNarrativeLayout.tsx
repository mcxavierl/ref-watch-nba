import type { ReactNode } from "react";
import { CloseGameSection } from "@/components/CloseGameSection";
import { RefProfileFingerprintSection } from "@/components/ref-profile/RefProfileFingerprintSection";
import { RefProfileDepthExpand } from "@/components/ref-profile/RefProfileDepthExpand";
import { RefProfileOfficiatingBiasSection } from "@/components/ref-profile/RefProfileOfficiatingBiasSection";
import { RefProfileMarketImpactPanel } from "@/components/ref-profile/RefProfileMarketImpactPanel";
import { StarDeferenceBadge } from "@/components/ref-profile/StarDeferenceBadge";
import {
  ScoutingReportDepth,
  ScoutingReportEdge,
} from "@/components/ref-profile/ScoutingReport";
import { RefProfileTeamTrends } from "@/components/ref-profile/RefProfileTeamTrends";
import { RefProfileDiscoveryPanel } from "@/components/ref-profile/RefProfileDiscoveryPanel";
import { RefProfileCareerEvolution } from "@/components/ref-profile/RefProfile";
import { RefStatGrid } from "@/components/RefStatGrid";
import { buildRefTeamPerformanceTrends } from "@/lib/ref-team-performance-trends";
import { computeRefStarDeference, supportsStarDeferenceLeague } from "@/lib/ref-star-deference";
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
  const starDeference =
    supportsStarDeferenceLeague(leagueId)
      ? computeRefStarDeference(leagueId, profile)
      : null;

  return (
    <div className="ref-narrative-layout">
      <RefProfileFingerprintSection
        leagueId={leagueId}
        profile={profile}
        stats={stats}
        qualified={qualified}
      />
      <ScoutingReportEdge {...scoutingProps} />
      {starDeference ? <StarDeferenceBadge analytics={starDeference} /> : null}

      <RefProfileCareerEvolution profile={profile} />

      <RefProfileDepthExpand label="Expand officiating and market depth">
        <div className="ref-narrative-outcome-grid">
          <RefProfileOfficiatingBiasSection
            profile={profile}
            leagueId={leagueId}
            stats={stats}
            qualified={qualified}
            gsniMetrics={gsniMetrics}
            whistleAnalytics={whistleAnalytics}
          />

          {showBettingProfile && profile.bettingStats ? (
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
          )}
        </div>

        {closeGameMetrics.length > 0 ? (
          <CloseGameSection
            metrics={closeGameMetrics}
            subjectLabel={profile.name}
            league={closeGameLeague}
            embedded
          />
        ) : null}

        <ScoutingReportDepth {...scoutingProps} />

        <RefProfileTeamTrends best={teamTrends.best} worst={teamTrends.worst} leagueId={leagueId} />
      </RefProfileDepthExpand>

      <RefProfileDiscoveryPanel leagueId={leagueId} profile={profile} />
    </div>
  );
}
