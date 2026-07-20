import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ResearchFindingDetail,
  researchFindingCanonicalPath,
} from "@/components/ResearchFindingDetail";
import {
  getResearchFindingById,
  getResearchFindingIdsForLeague,
} from "@/lib/research";
import { isLeagueManifestId, LEAGUE_MANIFEST } from "@/lib/league-manifest";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { researchFindingMetadata } from "@/lib/seo";

const DATA_LEAGUE_BY_ID = Object.fromEntries(
  Object.entries(LEAGUE_MANIFEST).map(([id, entry]) => [id, entry.dataLeague]),
) as Record<string, string>;

type PageProps = {
  params: Promise<{ league: string; id: string }>;
};

export async function generateStaticParams() {
  const params: Array<{ league: string; id: string }> = [];
  for (const league of Object.keys(LEAGUE_MANIFEST)) {
    const dataLeague = DATA_LEAGUE_BY_ID[league];
    if (!dataLeague) continue;
    for (const id of getResearchFindingIdsForLeague(
      dataLeague as Parameters<typeof getResearchFindingIdsForLeague>[0],
    )) {
      params.push({ league, id });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { league, id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding || !isLeagueManifestId(league)) {
    return { title: "Finding not found" };
  }
  const leagueShort = LEAGUES[league as LeagueId]?.shortLabel ?? league.toUpperCase();
  return researchFindingMetadata({
    headline: finding.headline,
    summary: finding.summary,
    path: researchFindingCanonicalPath(finding),
    leagueShort,
  });
}

export default async function LeagueResearchFindingDetailPage({ params }: PageProps) {
  const { league, id } = await params;
  if (!isLeagueManifestId(league)) notFound();
  const finding = getResearchFindingById(id);
  if (!finding) notFound();

  const canonical = researchFindingCanonicalPath(finding);
  const expectedPrefix = LEAGUE_MANIFEST[league].pathPrefix;
  if (!canonical.startsWith(`${expectedPrefix}/research/findings/`)) {
    redirect(canonical);
  }

  return <ResearchFindingDetail finding={finding} />;
}
