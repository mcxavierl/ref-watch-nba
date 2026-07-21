import { HomeHeroPreload } from "@/components/HomeHeroPreload";
import { JsonLd } from "@/components/JsonLd";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { OverviewIntelligenceHero } from "@/components/OverviewIntelligenceHero";
import { OverviewSecondaryTabs } from "@/components/OverviewSecondaryTabs";
import { PageContentFadeIn } from "@/components/PageContentFadeIn";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildPageMetadata, homepageWebPageJsonLd } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

/** Revalidate daily — homepage reads bundled overview snapshot, not live ref-stats. */
export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "Officiating intelligence",
  description:
    "Real-time behavioral modeling, crew friction analytics, and anomaly detection across NBA, NHL, NFL, EPL, La Liga, WNBA, and NCAA basketball.",
  path: SITE_HOME_PATH,
  keywords: [
    "officiating intelligence",
    "referee analytics",
    "crew friction",
    "anomaly detection",
    "multi-league refs",
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
          <OverviewDashboard
            data={data}
            hero={<OverviewIntelligenceHero data={data} />}
            exploreTabs={<OverviewSecondaryTabs data={data} />}
          />
        </div>
      </PageContentFadeIn>
    </>
  );
}
