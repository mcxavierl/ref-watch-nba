import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("app-like responsiveness", () => {
  it("PrefetchLink warms routes on hover and focus with prefetch enabled", () => {
    const source = readSrc("src/components/PrefetchLink.tsx");
    assert.match(source, /prefetch = true/);
    assert.match(source, /onMouseEnter/);
    assert.match(source, /onFocus/);
    assert.match(source, /router\.prefetch/);
  });

  it("grid and navigation hubs use PrefetchLink for Open hub, Compare, and profiles", () => {
    const targets = [
      "src/components/LeagueChooser.tsx",
      "src/components/OverviewLeaguePaceGrid.tsx",
      "src/components/BrowseActionCards.tsx",
      "src/components/LeaguePrimaryActionGrid.tsx",
      "src/components/LeagueSectionNav.tsx",
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
    assert.match(highlight, /prefetch=\{true\}/);
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
