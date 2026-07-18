import { notFound, redirect } from "next/navigation";
import { InsightsHubRoute } from "@/components/InsightsHubRoute";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";
import { computeFindings as computeCbbFindings } from "@/lib/cbb/findings";

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
  return hubPageMetadata(league as "nba", "research");
}

export default async function LeagueResearchFindingsPage({
  params,
  searchParams,
}: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !INSIGHTS_LEAGUES.has(league)) {
    notFound();
  }
  if (league === "cbb" && computeCbbFindings(1, [], { hub: true }).length === 0) {
    redirect(`/${league}/research/tendencies`);
  }
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId={league as "nba"}
      defaultTab="findings"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
