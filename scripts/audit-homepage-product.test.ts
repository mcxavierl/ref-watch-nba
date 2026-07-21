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
    assert.match(source, /GoldMineProofBar/);
    assert.match(source, /OverviewFeaturedSignal/);
    assert.match(source, /OverviewUpcomingSlateSection/);
    assert.match(source, /OverviewResearchFooter/);
  });
});

describe("mobile layout config", () => {
  it("targets a mobile viewport and homepage route", () => {
    assert.equal(MOBILE_LAYOUT_VIEWPORT.width, 390);
    assert.deepEqual(MOBILE_LAYOUT_PAGES.map((page) => page.path), ["/"]);
  });
});
