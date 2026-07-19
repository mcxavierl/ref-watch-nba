import { notFound } from "next/navigation";
import { dashboardOgContent, parseOgLeagueId } from "@/lib/og-hero";
import { isLeagueManifestId } from "@/lib/league-manifest";
import type { SlateHubLeagueId } from "@/lib/seo";
import {
  ogImageContentType,
  ogImageSize,
  renderDashboardOgImage,
} from "@/lib/og-image";

export const alt = "Ref Watch league hub";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function LeagueOpenGraphImage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams?: Promise<{ leagueId?: string }>;
}) {
  const { league } = await params;
  if (!isLeagueManifestId(league)) notFound();

  const query = searchParams ? await searchParams : undefined;
  const focusLeagueId =
    parseOgLeagueId(query?.leagueId) ?? parseOgLeagueId(league);

  return renderDashboardOgImage(
    dashboardOgContent(focusLeagueId as SlateHubLeagueId),
  );
}
