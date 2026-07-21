import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LEAGUE_HERO_GLOW_THEMES } from "@/lib/league-hero-glow-themes";

describe("league-hero-glow-themes", () => {
  it("defines dual glow colors for every hub hero league", () => {
    const leagues = ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb", "wnba"] as const;
    for (const league of leagues) {
      const theme = LEAGUE_HERO_GLOW_THEMES[league];
      assert.match(theme.left, /^rgb\(/);
      assert.match(theme.right, /^rgb\(/);
    }
  });

  it("wires ambient glow markup and CSS in LeagueHubHero", () => {
    const hero = readFileSync("src/components/LeagueHubHero.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(hero, /league-hub-hero-ambient/);
    assert.match(hero, /league-hub-hero-glow--left/);
    assert.match(hero, /league-hub-hero-glow--right/);
    assert.match(hero, /--league-hero-glow-left/);
    assert.match(css, /\.league-hub-hero-glow--left/);
    assert.match(css, /\.league-hub-hero-glow--right/);
    assert.match(css, /\.league-hub-hero-freshness/);
  });
});
