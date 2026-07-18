import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  insightsViewFromHash,
  insightsViewFromPathname,
  insightsViewHref,
} from "@/lib/insights-routes";

const ROUTED_LEAGUES = ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb"] as const;

const INSIGHTS_HUB_ROUTE_PAGES = ROUTED_LEAGUES.flatMap((league) => [
  `src/app/[league]/research/tendencies/page.tsx`,
  `src/app/[league]/research/trends/page.tsx`,
  `src/app/[league]/research/findings/page.tsx`,
]);

const INSIGHTS_HUB_ROUTE_IMPORT =
  /import\s*\{\s*InsightsHubRoute\s*\}\s*from\s*["']@\/components\/InsightsHubRoute["']/;
const INSIGHTS_HUB_PAGE_IMPORT_FROM_ROUTE =
  /import\s*\{[^}]*InsightsHubPage[^}]*\}\s*from\s*["']@\/components\/InsightsHubRoute["']/;

test("insightsViewHref maps tabs to unified research routes", () => {
  assert.equal(insightsViewHref("nba", "trends"), "/nba/research/trends");
  assert.equal(insightsViewHref("nba", "tendencies"), "/nba/research/tendencies");
  assert.equal(insightsViewHref("nba", "findings"), "/nba/research/findings");
  assert.equal(insightsViewHref("nfl", "trends"), "/nfl/research/trends");
  assert.equal(insightsViewHref("nfl", "tendencies"), "/nfl/research/tendencies");
  assert.equal(insightsViewHref("nfl", "findings"), "/nfl/research/findings");
  assert.equal(insightsViewHref("nfl", "game-state"), "/nfl/research/game-state");
});

test("insightsViewFromPathname resolves active tab from URL", () => {
  assert.equal(insightsViewFromPathname("/nfl/research/trends"), "trends");
  assert.equal(insightsViewFromPathname("/nba/research/trends"), "trends");
  assert.equal(insightsViewFromPathname("/nfl/research/tendencies"), "tendencies");
  assert.equal(insightsViewFromPathname("/nfl/research/findings"), "findings");
  assert.equal(insightsViewFromPathname("/nfl/research/game-state"), "game-state");
  assert.equal(insightsViewFromPathname("/nfl/rankings"), "tendencies");
});

test("insightsViewFromHash supports legacy rankings alias", () => {
  assert.equal(insightsViewFromHash("rankings"), "tendencies");
  assert.equal(insightsViewFromHash("trends"), "trends");
});

test("NFL game-state research route matches InsightsHubRoute wiring", () => {
  const rel = "src/app/[league]/research/game-state/page.tsx";
  const source = readFileSync(join(process.cwd(), rel), "utf8");
  assert.match(source, INSIGHTS_HUB_ROUTE_IMPORT);
  assert.match(source, /defaultTab="game-state"/);
  assert.match(source, /readSeasonScopeParam\(scope\)/);
  assert.match(source, /league !== "nfl"/);
});

test("insights hub route pages import InsightsHubRoute and render <InsightsHubRoute>", () => {
  for (const rel of INSIGHTS_HUB_ROUTE_PAGES) {
    const source = readFileSync(join(process.cwd(), rel), "utf8");
    assert.match(
      source,
      INSIGHTS_HUB_ROUTE_IMPORT,
      `${rel} must import { InsightsHubRoute } from @/components/InsightsHubRoute`,
    );
    assert.doesNotMatch(
      source,
      INSIGHTS_HUB_PAGE_IMPORT_FROM_ROUTE,
      `${rel} must not import InsightsHubPage from InsightsHubRoute (batch sed mistake)`,
    );
    assert.match(
      source,
      /<InsightsHubRoute[\s>/]/,
      `${rel} must render <InsightsHubRoute> in JSX`,
    );
    assert.doesNotMatch(
      source,
      /<InsightsHubPage[\s>/]/,
      `${rel} must not render <InsightsHubPage> directly (use InsightsHubRoute wrapper)`,
    );
  }
});

test("every league research route matches NFL scope wiring", () => {
  for (const rel of INSIGHTS_HUB_ROUTE_PAGES) {
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
      /searchParams: Promise<\{ scope\?: string(?:; conference\?: string)? \}>/,
      `${rel} must declare scope searchParams`,
    );
  }
});

test("every league research sub-route matches NFL defaultTab wiring", () => {
  const defaultTabs: Record<string, string> = {
    tendencies: "tendencies",
    trends: "trends",
    findings: "findings",
  };

  for (const segment of ["tendencies", "trends", "findings"] as const) {
    const rel = `src/app/[league]/research/${segment}/page.tsx`;
    const source = readFileSync(join(process.cwd(), rel), "utf8");
    assert.match(
      source,
      /readSeasonScopeParam\(scope\)/,
      `${rel} must pass scopeMode from searchParams like NFL`,
    );
    assert.match(
      source,
      new RegExp(`defaultTab="${defaultTabs[segment]}"`),
      `${rel} must set defaultTab like NFL`,
    );
  }
});

test("InsightsHubRoute preloads ref stats before rendering hub analytics", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/InsightsHubRoute.tsx"),
    "utf8",
  );
  assert.match(source, /await preloadLeagueRefStats\(/);
  assert.match(source, /await hydrateLeagueAnalyticsData\(/);
  const preloadIdx = source.indexOf("await preloadLeagueRefStats(");
  const hydrateIdx = source.indexOf("await hydrateLeagueAnalyticsData(");
  assert.ok(preloadIdx >= 0 && hydrateIdx >= 0 && preloadIdx < hydrateIdx);
});
