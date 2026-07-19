import {
  leagueHasResearchView,
  leagueManifestEntry,
  type InsightsLeagueId,
  type ResearchView,
} from "@/lib/league-manifest";

export const INSIGHTS_HUB_TAB_LABELS: Record<ResearchView, string> = {
  tendencies: "Tendencies",
  trends: "Trends",
  findings: "Findings",
  "game-state": "Game State",
};

/** Research sub-views exposed as hub tabs for a league. */
export function insightsHubTabViews(
  leagueId: InsightsLeagueId,
  options: { cbbHasFindings: boolean },
): ResearchView[] {
  const views = leagueManifestEntry(leagueId).researchViews;
  return views.filter((view) => {
    if (view === "findings" && leagueId === "cbb" && !options.cbbHasFindings) {
      return false;
    }
    return true;
  });
}

export function leagueSupportsInsightsView(
  leagueId: InsightsLeagueId,
  view: ResearchView,
  options: { cbbHasFindings: boolean },
): boolean {
  if (view === "findings" && leagueId === "cbb" && !options.cbbHasFindings) {
    return false;
  }
  return leagueHasResearchView(leagueId, view);
}
