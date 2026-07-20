import type { Metadata } from "next";
import { HomeHeroPreload } from "@/components/HomeHeroPreload";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { OverviewHero } from "@/components/OverviewHero";
import { OverviewSecondaryTabs } from "@/components/OverviewSecondaryTabs";
import { PageContentFadeIn } from "@/components/PageContentFadeIn";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

/** Revalidate daily — homepage reads bundled overview snapshot, not live ref-stats. */
export const revalidate = 86400;

export const metadata: Metadata = buildPageMetadata({
  title: "Verified officiating analytics",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, Premier League, La Liga, and NCAA men's basketball.",
  path: SITE_HOME_PATH,
  keywords: [
    "referee analytics",
    "multi-league refs",
    "NBA NHL NFL EPL officials",
    "whistle tendencies",
  ],
});

export default function HomePage() {
  const data = loadOverviewSnapshot();

  return (
    <>
      <HomeHeroPreload />
      <PageContentFadeIn>
        <div className="page-shell overview-shell overview-shell--clinical">
          <OverviewDashboard
            data={data}
            hero={<OverviewHero />}
            exploreTabs={<OverviewSecondaryTabs data={data} />}
          />
        </div>
      </PageContentFadeIn>
    </>
  );
}
