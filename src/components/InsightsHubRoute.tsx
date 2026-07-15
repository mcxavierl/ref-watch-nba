import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hydrateLeagueAnalyticsData } from "@/lib/league-analytics-hydrate";
import type { SeasonScopeMode } from "@/lib/season-scope";

type InsightsLeagueId = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

type InsightsHubRouteProps = {
  leagueId: InsightsLeagueId;
  defaultTab?: "tendencies" | "trends" | "findings";
  scopeMode?: SeasonScopeMode;
};

export async function InsightsHubRoute({
  leagueId,
  defaultTab = "tendencies",
  scopeMode,
}: InsightsHubRouteProps) {
  await hydrateLeagueAnalyticsData(leagueId);

  return (
    <InsightsHubPage
      leagueId={leagueId}
      defaultTab={defaultTab}
      scopeMode={scopeMode}
    />
  );
}
