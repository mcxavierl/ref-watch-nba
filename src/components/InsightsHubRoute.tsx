// App route pages must import { InsightsHubRoute } from this file and render
// <InsightsHubRoute>, not InsightsHubPage. See insights-routes.test.ts.
import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hydrateLeagueAnalyticsData } from "@/lib/league-analytics-hydrate";
import { preloadLeagueRefStats } from "@/lib/edge-preload";
import type { CbbTrendsConferenceScope } from "@/lib/cbb/conference-trends-shared";
import { SITE_URL } from "@/lib/site";
import type { SeasonScopeMode } from "@/lib/season-scope";

type InsightsLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type InsightsHubRouteProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings" | "game-state";
  scopeMode?: SeasonScopeMode;
  cbbTrendsConference?: CbbTrendsConferenceScope;
};

export async function InsightsHubRoute({
  leagueId,
  defaultTab = "tendencies",
  scopeMode,
  cbbTrendsConference,
}: InsightsHubRouteProps) {
  await preloadLeagueRefStats(SITE_URL, leagueId, { includeTeamSplits: false });
  await hydrateLeagueAnalyticsData(leagueId);

  return (
    <InsightsHubPage
      leagueId={leagueId}
      defaultTab={defaultTab}
      scopeMode={scopeMode}
      cbbTrendsConference={cbbTrendsConference}
    />
  );
}
