import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MOBILE_LAYOUT_PAGES, MOBILE_LAYOUT_VIEWPORT } from "./lib/mobile-layout-config";

const ROOT = join(import.meta.dirname, "..");

describe("audit-homepage-product", () => {
  it("package.json exposes audit:homepage-product script", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:homepage-product/);
    assert.match(pkg, /check:ci[\s\S]*audit:homepage-product/);
  });

  it("OverviewDashboard avoids deferred dual-narrative imports", () => {
    const source = readFileSync(join(ROOT, "src/components/OverviewDashboard.tsx"), "utf8");
    assert.doesNotMatch(source, /TodaysBiggestEdge/);
    assert.doesNotMatch(source, /IntelligenceFeedTicker/);
    assert.doesNotMatch(source, /TopSignal/);
    assert.doesNotMatch(source, /OverviewFeaturedSignal/);
    assert.doesNotMatch(source, /GoldMineProofBar/);
    assert.match(source, /OverviewUpcomingSlateSection/);
    assert.match(source, /OverviewResearchFooter/);
  });

  it("research footer renders cross-league top insights after league hubs", () => {
    const source = readFileSync(join(ROOT, "src/components/OverviewResearchFooter.tsx"), "utf8");
    const insights = readFileSync(join(ROOT, "src/components/OverviewTopInsightsSection.tsx"), "utf8");
    assert.match(source, /LeagueChooser/);
    assert.match(source, /OverviewTopInsightsSection/);
    assert.ok(source.indexOf("LeagueChooser") < source.indexOf("OverviewTopInsightsSection"));
    assert.match(insights, /buildTopStatisticalSignalCards/);
    assert.match(insights, /overview-top-insights-grid/);
  });
});

describe("mobile layout config", () => {
  it("targets a mobile viewport and homepage route", () => {
    assert.equal(MOBILE_LAYOUT_VIEWPORT.width, 390);
    assert.deepEqual(MOBILE_LAYOUT_PAGES.map((page) => page.path), ["/"]);
  });
});
