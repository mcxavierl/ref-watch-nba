import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LeagueSlatePage } from "@/components/LeagueSlatePage";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import {
  isLeagueManifestId,
  LEAGUE_MANIFEST,
} from "@/lib/league-manifest";
import { isSlateLeagueId, loadLeagueSlateBundle } from "@/lib/league-slate-data";
import {
  generateLeagueSlateMetadata,
} from "@/lib/seo";
import { slateMetadataDescription } from "@/lib/syndication";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !isSlateLeagueId(league)) {
    return {};
  }
  const pathname =
    (await headers()).get("x-pathname") ?? LEAGUE_MANIFEST[league].pathPrefix;
  await preloadLeagueRefStatsForPath(
    SITE_URL,
    league as Parameters<typeof preloadLeagueRefStatsForPath>[1],
    pathname,
  );
  const bundle = loadLeagueSlateBundle(league);
  return generateLeagueSlateMetadata(league, {
    isOffseason: bundle.isOffseason,
    isPending: bundle.isPending,
    slateDescription: bundle.isOffseason
      ? undefined
      : slateMetadataDescription(bundle.nightlyFeed),
  });
}

export default async function LeagueSlateRoute({ params, searchParams }: PageProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !LEAGUE_MANIFEST[league].routed) {
    notFound();
  }
  if (!isSlateLeagueId(league)) {
    notFound();
  }
  return <LeagueSlatePage leagueId={league} searchParams={searchParams} />;
}
