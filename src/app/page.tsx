import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { HomeHeroPreload } from "@/components/HomeHeroPreload";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { OverviewHero } from "@/components/OverviewHero";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import { buildLiveHighlightTickerItems } from "@/lib/live-highlights-ticker";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_HOME_PATH } from "@/lib/leagues";

const LiveHighlightsTicker = dynamic(
  () =>
    import("@/components/LiveHighlightsTicker").then(
      (mod) => mod.LiveHighlightsTicker,
    ),
  { loading: () => null },
);

const OverviewSecondaryTabs = dynamic(
  () =>
    import("@/components/OverviewSecondaryTabs").then(
      (mod) => mod.OverviewSecondaryTabs,
    ),
  { loading: () => null },
);

export const metadata: Metadata = buildPageMetadata({
  title: "Verified officiating analytics",
  description:
    "Cross-league referee analytics for the NBA, NHL, NFL, Premier League, and La Liga. NCAA college hubs coming soon.",
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
  const tickerItems = buildLiveHighlightTickerItems(
    data.insightCards.length > 0 ? data.insightCards : data.topStories,
  );

  return (
    <>
      <HomeHeroPreload />
      <div className="page-shell overview-shell">
        <OverviewDashboard
          data={data}
          hero={<OverviewHero />}
          highlightsTicker={
            tickerItems.length > 0 ? (
              <LiveHighlightsTicker items={tickerItems} />
            ) : null
          }
          exploreTabs={<OverviewSecondaryTabs data={data} />}
        />
      </div>
    </>
  );
}
