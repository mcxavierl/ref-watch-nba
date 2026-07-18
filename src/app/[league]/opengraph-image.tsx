import { notFound } from "next/navigation";
import { hubOgContentForLeague } from "@/lib/og-hub";
import { isLeagueManifestId } from "@/lib/league-manifest";
import type { SlateHubLeagueId } from "@/lib/seo";
import { ogImageContentType, ogImageSize, renderHubOgImage } from "@/lib/og-image";

export const alt = "Ref Watch league hub";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function LeagueOpenGraphImage({
  params,
}: {
  params: Promise<{ league: string }>;
}) {
  const { league } = await params;
  if (!isLeagueManifestId(league)) notFound();
  const content = hubOgContentForLeague(league as SlateHubLeagueId);
  if (!content) notFound();
  return renderHubOgImage(content);
}
