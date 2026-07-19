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
  it("builds a 2x3 league hub grid with one slate card", () => {
    const content = dashboardOgContent();
    assert.ok(content.leagueCards.length >= 1);
    assert.ok(content.leagueCards.length <= 6);
    assert.ok(content.slateGame === null || typeof content.slateGame.awayTeam === "string");
  });

  it("highlights a focused league when leagueId is provided", () => {
    const content = dashboardOgContent("nfl");
    assert.equal(content.focusLeagueId, "nfl");
    const nflCard = content.leagueCards.find((card) => card.leagueId === "nfl");
    assert.ok(nflCard);
    assert.equal(nflCard?.highlighted, true);
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
  it("uses shared Tailwind slate tokens on hub and slate cards", () => {
    const hub = readSrc("src/components/og-components/LeagueHubCard.tsx");
    const slate = readSrc("src/components/og-components/UpcomingSlateCard.tsx");
    const hero = readSrc("src/components/og-components/HeroView.tsx");

    assert.match(hub, /backgroundColor: "#0f172a"/);
    assert.match(hub, /boxShadow:[\s\S]*"none"/);
    assert.match(slate, /backgroundColor: "#020617"/);
    assert.match(hero, /display: "flex"/);
    assert.match(hero, /UpcomingSlateCard/);
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
    assert.match(renderer, /tailwindConfig/);
  });
});
