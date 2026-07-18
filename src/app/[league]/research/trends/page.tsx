import { notFound } from "next/navigation";
import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { readCbbTrendsConferenceParam } from "@/lib/cbb/conference-trends-shared";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string; conference?: string }>;
};

const INSIGHTS_LEAGUES = new Set([
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
]);

export async function generateMetadata({ params }: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !INSIGHTS_LEAGUES.has(league)) {
    return {};
  }
  return hubPageMetadata(league as "nba", "trends");
}

export default async function LeagueResearchTrendsPage({
  params,
  searchParams,
}: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !INSIGHTS_LEAGUES.has(league)) {
    notFound();
  }
  const { scope, conference } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId={league as "nba"}
      defaultTab="trends"
      scopeMode={readSeasonScopeParam(scope)}
      cbbTrendsConference={readCbbTrendsConferenceParam(conference)}
    />
  );
}
