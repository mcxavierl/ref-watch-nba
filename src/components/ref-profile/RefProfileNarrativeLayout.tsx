import type { ReactNode } from "react";
import { RefProfileOfficiatingBiasSection } from "@/components/ref-profile/RefProfileOfficiatingBiasSection";
import { RefProfileMarketImpactPanel } from "@/components/ref-profile/RefProfileMarketImpactPanel";
import { RefProfileTeamTrends } from "@/components/ref-profile/RefProfileTeamTrends";
import { RefStatGrid } from "@/components/RefStatGrid";
import { buildRefTeamPerformanceTrends } from "@/lib/ref-team-performance-trends";
import type { CloseGameMetrics } from "@/lib/close-game";
import type { LeagueId } from "@/lib/leagues";
import type { RefGsniMetrics } from "@/lib/ref-gsni";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type CloseGameLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

type StatGridLabels = {
  foulLabel?: string;
  scoreLabel?: string;
  overLabel?: string;
};

/** Four-row narrative layout: bias, market impact, and team context. */
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

  return (
    <div className="ref-narrative-layout">
      <div className="ref-narrative-outcome-grid">
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

        {showBettingProfile && profile.bettingStats ? (
          <RefProfileMarketImpactPanel
            profile={profile}
            stats={profile.bettingStats}
            leagueId={leagueId}
            showMetrics={qualified}
            hideWhistleMetrics={hideWhistleMetrics}
          />
        ) : (
          <section className="ref-profile-section ref-market-impact">
            <h2 className="ref-profile-section-title">Market Impact</h2>
            <RefStatGrid
              profile={profile}
              overBaseline={stats.meta.leagueOverBaseline}
              foulLabel={statGridLabels?.foulLabel}
              scoreLabel={statGridLabels?.scoreLabel}
              overLabel={statGridLabels?.overLabel}
              showMetrics={qualified}
            />
          </section>
        )}
      </div>

      <RefProfileTeamTrends best={teamTrends.best} worst={teamTrends.worst} leagueId={leagueId} />
    </div>
  );
}
