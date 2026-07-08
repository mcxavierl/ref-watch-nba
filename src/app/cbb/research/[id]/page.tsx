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
import { researchFindingMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return getResearchFindingIdsForLeague("CBB").map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) {
    return { title: "Finding not found", robots: { index: false, follow: false } };
  }
  if (finding.league !== "CBB") {
    return researchFindingMetadata({
      headline: finding.headline,
      summary: finding.summary,
      path: researchFindingCanonicalPath(finding),
      leagueShort: finding.league,
    });
  }
  return researchFindingMetadata({
    headline: finding.headline,
    summary: finding.summary,
    path: `/cbb/research/${id}`,
    leagueShort: "CBB",
  });
}

export default async function CbbResearchFindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) notFound();
  if (finding.league !== "CBB") {
    redirect(researchFindingCanonicalPath(finding));
  }

  return <ResearchFindingDetail finding={finding} />;
}
