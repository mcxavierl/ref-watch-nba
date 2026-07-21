import type { Metadata } from "next";
import { HomeHeroPreload } from "@/components/HomeHeroPreload";
import { JsonLd } from "@/components/JsonLd";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { PageContentFadeIn } from "@/components/PageContentFadeIn";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata, homepageWebPageJsonLd } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

/** Revalidate daily — homepage reads bundled overview snapshot, not live ref-stats. */
export const revalidate = 86400;

export const metadata: Metadata = buildPageMetadata({
  title: "Verified officiating analytics",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, Premier League, La Liga, WNBA, and NCAA men's basketball.",
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
      <JsonLd data={homepageWebPageJsonLd()} />
      <HomeHeroPreload />
      <PageContentFadeIn>
        <div className="page-shell overview-shell overview-shell--clinical">
          <OverviewDashboard data={data} />
        </div>
      </PageContentFadeIn>
    </>
  );
}
