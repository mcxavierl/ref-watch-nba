import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  insightsViewFromHash,
  insightsViewFromPathname,
  insightsViewHref,
} from "@/lib/insights-routes";

const INSIGHTS_HUB_PAGES = [
  "src/app/insights/page.tsx",
  "src/app/nhl/insights/page.tsx",
  "src/app/nfl/insights/page.tsx",
  "src/app/epl/insights/page.tsx",
  "src/app/laliga/insights/page.tsx",
  "src/app/cbb/insights/page.tsx",
  "src/app/cfb/insights/page.tsx",
] as const;

const INSIGHTS_SUBPAGES = [
  "rankings",
  "trends",
  "research",
] as const;

const LEAGUE_PREFIXES = [
  "",
  "nhl",
  "nfl",
  "epl",
  "laliga",
  "cbb",
  "cfb",
] as const;

test("insightsViewHref maps tabs to canonical routes", () => {
  assert.equal(insightsViewHref("nba", "trends"), "/trends");
  assert.equal(insightsViewHref("nba", "tendencies"), "/rankings");
  assert.equal(insightsViewHref("nba", "findings"), "/research");
  assert.equal(insightsViewHref("nfl", "trends"), "/nfl/trends");
  assert.equal(insightsViewHref("nfl", "tendencies"), "/nfl/rankings");
  assert.equal(insightsViewHref("nfl", "findings"), "/nfl/research");
});

test("insightsViewFromPathname resolves active tab from URL", () => {
  assert.equal(insightsViewFromPathname("/nfl/trends"), "trends");
  assert.equal(insightsViewFromPathname("/trends"), "trends");
  assert.equal(insightsViewFromPathname("/nfl/rankings"), "tendencies");
  assert.equal(insightsViewFromPathname("/nfl/research"), "findings");
  assert.equal(insightsViewFromPathname("/nfl/insights"), null);
});

test("insightsViewFromHash supports legacy rankings alias", () => {
  assert.equal(insightsViewFromHash("rankings"), "tendencies");
  assert.equal(insightsViewFromHash("trends"), "trends");
});

test("every league insights hub route matches NFL scope wiring", () => {
  for (const rel of INSIGHTS_HUB_PAGES) {
    const source = readFileSync(join(process.cwd(), rel), "utf8");
    assert.match(
      source,
      /readSeasonScopeParam\(scope\)/,
      `${rel} must pass scopeMode from searchParams like NFL`,
    );
    assert.match(
      source,
      /InsightsHubRoute[\s\S]*scopeMode=/,
      `${rel} must forward scopeMode to InsightsHubRoute`,
    );
    assert.match(
      source,
      /searchParams: Promise<\{ scope\?: string \}>/,
      `${rel} must declare scope searchParams`,
    );
  }
});

test("every league insights sub-route matches NFL defaultTab wiring", () => {
  const defaultTabs: Record<(typeof INSIGHTS_SUBPAGES)[number], string> = {
    rankings: "tendencies",
    trends: "trends",
    research: "findings",
  };

  for (const prefix of LEAGUE_PREFIXES) {
    for (const segment of INSIGHTS_SUBPAGES) {
      const rel = prefix
        ? `src/app/${prefix}/${segment}/page.tsx`
        : `src/app/${segment}/page.tsx`;
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      assert.match(
        source,
        /readSeasonScopeParam\(scope\)/,
        `${rel} must pass scopeMode from searchParams like NFL`,
      );
      if (segment === "research") {
        assert.match(
          source,
          /defaultTab="findings"|InsightsResearchPage/,
          `${rel} must render findings via defaultTab or InsightsResearchPage`,
        );
      } else {
        assert.match(
          source,
          new RegExp(`defaultTab="${defaultTabs[segment]}"`),
          `${rel} must set defaultTab like NFL`,
        );
      }
    }
  }
});
