import { notFound, redirect } from "next/navigation";
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
  return hubPageMetadata(league as "nba", "research");
}

export default async function LeagueResearchGameStatePage({
  params,
  searchParams,
}: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !INSIGHTS_LEAGUES.has(league)) {
    notFound();
  }
  if (league !== "nfl") {
    redirect(`/${league}/research/tendencies`);
  }
  const { scope } = await searchParams;
  return (
    <InsightsHubRoute
      leagueId="nfl"
      defaultTab="game-state"
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
