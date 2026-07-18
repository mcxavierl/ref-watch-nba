import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isLeagueManifestId, researchViewHref } from "@/lib/league-manifest";

type PageProps = {
  params: Promise<{ league: string }>;
};

/** /{league}/research → tendencies (default research view) */
export default async function LeagueResearchIndexPage({ params }: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league)) notFound();
  redirect(researchViewHref(league, "tendencies"));
}
