import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ResearchFindingDetail,
  researchFindingCanonicalPath,
} from "@/components/ResearchFindingDetail";
import { getResearchFindingById } from "@/lib/research";
import { inferFindingLeague } from "@/lib/findings-shared";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { researchFindingMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy NBA finding URLs at /research/{id} (excludes /research/validation etc.) */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) {
    return { title: "Finding not found" };
  }
  const leagueId = inferFindingLeague(finding).toLowerCase() as LeagueId;
  return researchFindingMetadata({
    headline: finding.headline,
    summary: finding.summary,
    path: researchFindingCanonicalPath(finding),
    leagueShort: LEAGUES[leagueId]?.shortLabel ?? inferFindingLeague(finding),
  });
}

export default async function LegacyNbaResearchFindingPage({ params }: PageProps) {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) notFound();
  const canonical = researchFindingCanonicalPath(finding);
  if (canonical !== `/nba/research/findings/${id}`) {
    redirect(canonical);
  }
  return <ResearchFindingDetail finding={finding} />;
}
