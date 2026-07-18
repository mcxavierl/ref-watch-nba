import { notFound } from "next/navigation";
import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string }>;
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
  return hubPageMetadata(league as "nba", "rankings");
}

export default async function LeagueResearchTendenciesPage({
  params,
  searchParams,
}: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !INSIGHTS_LEAGUES.has(league)) {
    notFound();
  }
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId={league as "nba"}
      defaultTab="tendencies"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
