import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import type { SeasonScopeMode } from "@/lib/season-scope";

type InsightsResearchPageProps = {
  leagueId: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  scopeMode: SeasonScopeMode;
};

export async function InsightsResearchPage({
  leagueId,
  scopeMode,
}: InsightsResearchPageProps) {
  return (
    <InsightsHubRoute
      leagueId={leagueId}
      defaultTab="findings"
      scopeMode={scopeMode}
    />
  );
}
