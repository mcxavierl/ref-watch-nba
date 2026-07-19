import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { dashboardOgContent, parseOgLeagueId } from "@/lib/og-hero";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("dashboard OG hero", () => {
  it("builds three pulse insights with one slate card", () => {
    const content = dashboardOgContent();
    assert.ok(content.pulseInsights.length >= 1);
    assert.ok(content.pulseInsights.length <= 3);
    assert.ok(content.slateGame === null || typeof content.slateGame.awayTeam === "string");
  });

  it("prioritizes focused league insights when leagueId is provided", () => {
    const global = dashboardOgContent();
    const content = dashboardOgContent("nfl");
    assert.equal(content.focusLeagueId, "nfl");
    const globalNflIndex = global.pulseInsights.findIndex(
      (insight) => insight.league === "NFL",
    );
    const focusedNflIndex = content.pulseInsights.findIndex(
      (insight) => insight.league === "NFL",
    );
    if (globalNflIndex >= 0 && focusedNflIndex >= 0) {
      assert.ok(focusedNflIndex <= globalNflIndex);
    }
    if (content.slateGame) {
      assert.equal(content.slateGame.leagueId, "nfl");
    }
  });

  it("parses leagueId search params", () => {
    assert.equal(parseOgLeagueId("nfl"), "nfl");
    assert.equal(parseOgLeagueId("NBA"), "nba");
    assert.equal(parseOgLeagueId(undefined), null);
    assert.equal(parseOgLeagueId("invalid"), null);
  });
});

describe("dashboard OG components", () => {
  it("uses insight pulse cards and explicit widths in HeroView", () => {
    const hero = readSrc("src/components/og-components/HeroView.tsx");
    const pulse = readSrc("src/components/og-components/OgPulseInsightCard.tsx");
    const slate = readSrc("src/components/og-components/UpcomingSlateCard.tsx");

    assert.match(hero, /OgPulseInsightCard/);
    assert.match(hero, /width: 229/);
    assert.match(hero, /League pulse/);
    assert.match(pulse, /Notable/);
    assert.match(slate, /backgroundColor: "#020617"/);
  });

  it("routes render dashboard hero snapshots with leagueId search params", () => {
    const rootRoute = readSrc("src/app/opengraph-image.tsx");
    const leagueRoute = readSrc("src/app/[league]/opengraph-image.tsx");
    const renderer = readSrc("src/lib/og-image.tsx");

    assert.match(rootRoute, /searchParams/);
    assert.match(rootRoute, /leagueId/);
    assert.match(rootRoute, /renderDashboardOgImage/);
    assert.match(leagueRoute, /renderDashboardOgImage/);
    assert.match(renderer, /renderDashboardOgImage/);
  });
});
