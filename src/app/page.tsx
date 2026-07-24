import { HomeHeroPreload } from "@/components/HomeHeroPreload";
import { JsonLd } from "@/components/JsonLd";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { OverviewIntelligenceHero } from "@/components/OverviewIntelligenceHero";
import { OverviewSecondaryTabs } from "@/components/OverviewSecondaryTabs";
import { PageContentFadeIn } from "@/components/PageContentFadeIn";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { preloadAssignmentsForLiveSlate } from "@/lib/assignments-preload";
import { preloadGameLogsForLiveSlate } from "@/lib/game-logs-preload";
import { getLiveSlateGames } from "@/lib/live-slate-engine";
import { mergeLiveSlateGamesWithSeed } from "@/lib/merge-slate-historical-context";
import { HOMEPAGE_SLATE_GRID_SIZE } from "@/lib/overview-slate-shared";
import { buildPageMetadata, homepageWebPageJsonLd } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildPageMetadata({
  title: "Officiating intelligence",
  description:
    "Referee and official analytics, crew assignments, and anomaly detection across NBA, NHL, NFL, EPL, La Liga, WNBA, and NCAA basketball.",
  path: SITE_HOME_PATH,
  keywords: [
    "officiating intelligence",
    "referee analytics",
    "crew assignments",
    "anomaly detection",
    "multi-league refs",
  ],
});

export default async function HomePage() {
  await Promise.all([
    preloadAssignmentsForLiveSlate(SITE_URL),
    preloadGameLogsForLiveSlate(SITE_URL),
  ]);
  const snapshot = loadOverviewSnapshot();
  const liveSlate = getLiveSlateGames({ limit: HOMEPAGE_SLATE_GRID_SIZE });
  const upcomingSlate = {
    ...liveSlate,
    games: mergeLiveSlateGamesWithSeed(
      liveSlate.games,
      snapshot.upcomingSlate.games ?? [],
    ),
  };
  const data = {
    ...snapshot,
    upcomingSlate,
  };

  return (
    <>
      <JsonLd data={homepageWebPageJsonLd()} />
      <HomeHeroPreload />
      <PageContentFadeIn>
        <div className="page-shell overview-shell overview-shell--clinical overview-homepage-shell">
          <OverviewDashboard
            data={data}
            historicalSeedGames={snapshot.upcomingSlate.games ?? []}
            hero={<OverviewIntelligenceHero data={data} />}
            exploreTabs={<OverviewSecondaryTabs data={data} />}
          />
        </div>
      </PageContentFadeIn>
    </>
  );
}
