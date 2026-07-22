import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("app-like responsiveness", () => {
  it("PrefetchLink uses full-page SiteNavLink anchors", () => {
    const source = readSrc("src/components/PrefetchLink.tsx");
    assert.match(source, /SiteNavLink/);
    assert.doesNotMatch(source, /from "next\/link"/);
    assert.doesNotMatch(source, /useRouter/);
    assert.doesNotMatch(source, /router\.prefetch/);
    assert.doesNotMatch(source, /onMouseEnter/);
  });

  it("grid and navigation hubs use PrefetchLink for Open hub, Compare, and profiles", () => {
    const targets = [
      "src/components/LeagueHubCard.tsx",
      "src/components/OverviewLeaguePaceGrid.tsx",
      "src/components/BrowseActionCards.tsx",
      "src/components/LeaguePrimaryActionGrid.tsx",
      "src/components/RefCompareLink.tsx",
      "src/components/RefRankingsTable.tsx",
      "src/components/RankingSignalPill.tsx",
      "src/components/RefProfilePreviewDrawer.tsx",
    ];

    for (const file of targets) {
      const source = readSrc(file);
      assert.match(source, /PrefetchLink/, `${file} should use PrefetchLink`);
      assert.doesNotMatch(
        source,
        /from "next\/link"/,
        `${file} should not import next/link directly`,
      );
    }

    const highlight = readSrc("src/components/HighlightStatCard.tsx");
    assert.match(highlight, /PrefetchLink[\s\S]*highlight-stat-profile/);
  });

  it("exposes route loading skeletons and fade-in wrapper", () => {
    assert.match(readSrc("src/components/PageSkeleton.tsx"), /animate-pulse/);
    assert.match(readSrc("src/components/PageContentFadeIn.tsx"), /page-content-fade-in/);
    assert.match(readSrc("src/app/[league]/loading.tsx"), /PageSkeleton/);
    assert.match(readSrc("src/app/[league]/refs/[slug]/loading.tsx"), /PageSkeleton/);
    assert.match(readSrc("src/app/globals.css"), /page-content-fade-in/);
    assert.match(readSrc("src/app/[league]/layout.tsx"), /PageContentFadeIn/);
  });

  it("does not alter league hub preload or ref profile static generation", () => {
    const layout = readSrc("src/app/[league]/layout.tsx");
    const refRoute = readSrc("src/app/[league]/refs/[slug]/page.tsx");
    assert.match(layout, /preloadLeagueRefStatsForPath/);
    assert.match(refRoute, /generateStaticParams/);
    assert.match(refRoute, /importRefProfilePage/);
  });
});
