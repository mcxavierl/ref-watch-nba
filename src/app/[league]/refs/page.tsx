import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RefsHubPage } from "@/components/RefsHubPage";
import { isLeagueManifestId } from "@/lib/league-manifest";
import { hubPageMetadata } from "@/lib/seo";
import { readSeasonScopeParam } from "@/lib/season-scope";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string }>;
};

const REFS_LEAGUES = new Set([
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
  if (!isLeagueManifestId(league) || !REFS_LEAGUES.has(league)) {
    return {};
  }
  return hubPageMetadata(league as "nba", "refs");
}

export default async function LeagueRefsPage({ params, searchParams }: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !REFS_LEAGUES.has(league)) {
    notFound();
  }
  const { scope } = await searchParams;
  return (
    <RefsHubPage
      leagueId={league as "nba"}
      scopeMode={readSeasonScopeParam(scope)}
    />
  );
}
