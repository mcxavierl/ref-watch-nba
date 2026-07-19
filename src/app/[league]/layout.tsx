import { notFound } from "next/navigation";
import { CollegeLeagueGate } from "@/components/CollegeLeagueGate";
import { LeagueSectionNav } from "@/components/LeagueSectionNav";
import { NflBettingHonestyBanner } from "@/components/NflBettingHonestyBanner";
import { preloadLeagueRefStatsForPath } from "@/lib/edge-preload";
import {
  isLeagueManifestId,
  LEAGUE_MANIFEST,
  LEAGUE_MANIFEST_IDS,
} from "@/lib/league-manifest";
import { SITE_URL } from "@/lib/site";
import { headers } from "next/headers";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
};

export default async function LeagueHubLayout({ children, params }: LayoutProps) {
  const { league } = await params;
  if (!isLeagueManifestId(league)) {
    notFound();
  }
  if (!LEAGUE_MANIFEST[league].routed) {
    notFound();
  }

  const pathname = (await headers()).get("x-pathname") ?? LEAGUE_MANIFEST[league].pathPrefix;
  await preloadLeagueRefStatsForPath(SITE_URL, league as Parameters<typeof preloadLeagueRefStatsForPath>[1], pathname);

  const content = (
    <>
      {league === "nfl" ? <NflBettingHonestyBanner /> : null}
      <LeagueSectionNav leagueId={league} />
      {children}
    </>
  );

  if (league === "cbb" || league === "cfb") {
    return (
      <CollegeLeagueGate leagueId={league as "cbb" | "cfb"}>
        {content}
      </CollegeLeagueGate>
    );
  }

  return content;
}

export async function generateStaticParams() {
  return LEAGUE_MANIFEST_IDS.filter((id) => LEAGUE_MANIFEST[id].routed).map((league) => ({
    league,
  }));
}
