import type { RefBettingStats, RefProfile } from "@/lib/types";
import type { LeagueId } from "@/lib/leagues";
import { RefProfileMarketImpactPanel } from "@/components/ref-profile/RefProfileMarketImpactPanel";

/** @deprecated Use RefProfileMarketImpactPanel in RefProfileNarrativeLayout. */
export function RefBettingProfile({
  profile,
  stats,
  leagueId,
  showMetrics = true,
  hideWhistleMetrics = false,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
  leagueId: LeagueId;
  showMetrics?: boolean;
  hideWhistleMetrics?: boolean;
}) {
  return (
    <RefProfileMarketImpactPanel
      profile={profile}
      stats={stats}
      leagueId={leagueId}
      showMetrics={showMetrics}
      hideWhistleMetrics={hideWhistleMetrics}
    />
  );
}
