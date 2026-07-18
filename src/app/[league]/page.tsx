import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueSlatePage } from "@/components/LeagueSlatePage";
import {
  isLeagueManifestId,
  LEAGUE_MANIFEST,
} from "@/lib/league-manifest";
import { isSlateLeagueId, loadLeagueSlateBundle } from "@/lib/league-slate-data";
import {
  generateLeagueSlateMetadata,
} from "@/lib/seo";
import { slateMetadataDescription } from "@/lib/syndication";

type PageProps = {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ scope?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { league } = await params;
  if (!isLeagueManifestId(league) || !isSlateLeagueId(league)) {
    return {};
  }
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
