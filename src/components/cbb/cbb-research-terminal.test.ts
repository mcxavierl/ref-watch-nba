import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("CBB slate uses research terminal conference nav and feed", () => {
  const slate = readFileSync("src/components/LeagueSlatePage.tsx", "utf8");
  assert.match(slate, /CbbConferenceNavSection/);
  assert.match(slate, /CbbResearchFeed/);
  assert.match(slate, /page-shell-slate--cbb-terminal/);
  assert.match(slate, /leagueId === "cbb" \? \([\s\S]*CbbResearchFeed/);
});

test("CBB conference hub uses matrix-style top 10 leaderboard", () => {
  const hub = readFileSync("src/components/CbbConferenceHub.tsx", "utf8");
  assert.match(hub, /CbbRefRankMatrix/);
  assert.doesNotMatch(hub, /RefRankingsTable/);
  assert.match(hub, /Top 10 officials/);
});

test("CBB research terminal nav has mobile select and desktop chips", () => {
  const nav = readFileSync("src/components/cbb/CbbConferenceNav.tsx", "utf8");
  const css = readFileSync("src/components/cbb/cbb-research-terminal.css", "utf8");
  assert.match(nav, /cbb-conference-nav-select/);
  assert.match(nav, /cbb-conference-chip-list/);
  assert.match(nav, /cbb-conference-chip--active/);
  assert.match(css, /cbb-conference-nav-select-wrap[\s\S]*display: none/);
  assert.match(css, /header-sapphire/);
});

test("CBB ref rank matrix includes rank column and tabular numerals", () => {
  const matrix = readFileSync("src/components/cbb/CbbRefRankMatrix.tsx", "utf8");
  const css = readFileSync("src/components/cbb/cbb-research-terminal.css", "utf8");
  assert.match(matrix, /cbb-ref-rank-matrix-rank/);
  assert.match(matrix, /tabular-nums/);
  assert.match(matrix, /Over rate/);
  assert.match(matrix, /Fouls/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
});

test("CBB research feed renders two-column insight cards", () => {
  const feed = readFileSync("src/components/cbb/CbbResearchFeed.tsx", "utf8");
  const css = readFileSync("src/components/cbb/cbb-research-terminal.css", "utf8");
  assert.match(feed, /cbb-research-feed-grid/);
  assert.match(feed, /cbb-research-feed-tag/);
  assert.match(feed, /Read More/);
  assert.match(feed, /refProfileHref/);
  assert.match(css, /grid-template-columns: repeat\(2/);
});
