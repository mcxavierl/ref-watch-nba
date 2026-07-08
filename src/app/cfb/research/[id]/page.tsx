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
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getResearchFindingIdsForLeague("CFB").map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) {
    return { title: "Finding not found" };
  }
  return {
    title: finding.headline,
    description: finding.summary,
    alternates: { canonical: absoluteUrl(`/cfb/research/${id}`) },
  };
}

export default async function NhlResearchFindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) notFound();
  if (finding.league === "NBA") {
    redirect(researchFindingCanonicalPath(finding));
  }

  return <ResearchFindingDetail finding={finding} />;
}
