import {
  isInsightsLeagueId,
  isLeagueManifestId,
  leagueHasResearchView,
  type InsightsLeagueId,
  type ResearchView,
} from "@/lib/league-manifest";

export function resolveInsightsLeagueRoute(
  league: string,
): InsightsLeagueId | null {
  if (!isLeagueManifestId(league) || !isInsightsLeagueId(league)) {
    return null;
  }
  return league;
}

export function resolveResearchViewRoute(
  league: string,
  view: ResearchView,
): InsightsLeagueId | null {
  const resolved = resolveInsightsLeagueRoute(league);
  if (!resolved || !leagueHasResearchView(resolved, view)) {
    return null;
  }
  return resolved;
}
