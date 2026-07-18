import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ResearchFindingDetail,
  researchFindingCanonicalPath,
} from "@/components/ResearchFindingDetail";
import { getResearchFindingById } from "@/lib/research";
import { absoluteUrl } from "@/lib/site";

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
  return {
    title: finding.headline,
    description: finding.summary,
    alternates: { canonical: absoluteUrl(researchFindingCanonicalPath(finding)) },
  };
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
