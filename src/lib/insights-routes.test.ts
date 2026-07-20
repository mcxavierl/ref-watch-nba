import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  insightsViewFromHash,
  insightsViewFromPathname,
  insightsViewHref,
} from "@/lib/insights-routes";
import {
  leagueHasResearchView,
  type InsightsLeagueId,
} from "@/lib/league-manifest";

const ROUTED_LEAGUES = ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb"] as const;

const RESEARCH_VIEW_PAGES = [
  "tendencies",
  "trends",
  "findings",
  "game-state",
] as const;

const RESEARCH_ROUTE_FACTORY =
  /from\s*["']@\/lib\/research-route-page["']/;

test("insightsViewHref maps tabs to unified research routes", () => {
  assert.equal(insightsViewHref("nba", "trends"), "/nba/research/trends");
  assert.equal(insightsViewHref("nba", "tendencies"), "/nba/research/tendencies");
  assert.equal(insightsViewHref("nba", "findings"), "/nba/research/findings");
  assert.equal(insightsViewHref("nfl", "trends"), "/nfl/research/trends");
  assert.equal(insightsViewHref("nfl", "tendencies"), "/nfl/research/tendencies");
  assert.equal(insightsViewHref("nfl", "findings"), "/nfl/research/findings");
  assert.equal(insightsViewHref("nfl", "game-state"), "/nfl/research/game-state");
  assert.equal(insightsViewHref("nba", "game-state"), "/nba/research/game-state");
  assert.equal(insightsViewHref("nhl", "game-state"), "/nhl/research/game-state");
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

test("game-state research route uses manifest-backed factory", () => {
  const rel = "src/app/[league]/research/game-state/page.tsx";
  const source = readFileSync(join(process.cwd(), rel), "utf8");
  assert.match(source, RESEARCH_ROUTE_FACTORY);
  assert.match(source, /createResearchViewPage\("game-state"\)/);
});

test("research view pages use research-route-page factory", () => {
  for (const segment of RESEARCH_VIEW_PAGES) {
    const rel = `src/app/[league]/research/${segment}/page.tsx`;
    const source = readFileSync(join(process.cwd(), rel), "utf8");
    assert.match(
      source,
      RESEARCH_ROUTE_FACTORY,
      `${rel} must import from @/lib/research-route-page`,
    );
  }
});

test("game-state is manifest-gated for NFL, NBA, and NHL", () => {
  const gsniLeagues: InsightsLeagueId[] = ["nfl", "nba", "nhl"];
  for (const league of gsniLeagues) {
    assert.equal(leagueHasResearchView(league, "game-state"), true);
  }
  assert.equal(leagueHasResearchView("epl", "game-state"), false);
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
