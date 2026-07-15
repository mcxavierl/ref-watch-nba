import { InsightsHubPage } from "@/components/InsightsHubPage";
import { hydrateInsightsFindingsData } from "@/lib/insights-findings-hydrate";
import type { SeasonScopeMode } from "@/lib/season-scope";

type InsightsResearchPageProps = {
  leagueId: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  scopeMode: SeasonScopeMode;
};

export async function InsightsResearchPage({
  leagueId,
  scopeMode,
}: InsightsResearchPageProps) {
  await hydrateInsightsFindingsData(leagueId);

  return (
    <InsightsHubPage
      leagueId={leagueId}
      defaultTab="findings"
      scopeMode={scopeMode}
    />
  );
}
