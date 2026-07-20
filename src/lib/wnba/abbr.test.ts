import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWnbaAbbr, wnbaAbbrAliases } from "@/lib/wnba/abbr";
import { resolveWnbaTeamAbbr, teamLogoUrl } from "@/lib/wnba/teams";
import {
  buildOverviewRecentGameContextLine,
  buildOverviewTeamRecentContextLine,
} from "@/lib/overview-matchup-insight";

describe("wnba abbr", () => {
  it("normalizes ESPN abbreviations to canonical keys", () => {
    assert.equal(normalizeWnbaAbbr("LV"), "LVA");
    assert.equal(normalizeWnbaAbbr("NY"), "NYL");
    assert.equal(normalizeWnbaAbbr("WSH"), "WAS");
    assert.equal(normalizeWnbaAbbr("GS"), "GSV");
  });

  it("resolves official city names to canonical abbreviations", () => {
    assert.equal(resolveWnbaTeamAbbr("Las Vegas"), "LVA");
    assert.equal(resolveWnbaTeamAbbr("New York"), "NYL");
    assert.equal(resolveWnbaTeamAbbr("Golden State"), "GSV");
    assert.equal(resolveWnbaTeamAbbr("Washington"), "WAS");
    assert.equal(resolveWnbaTeamAbbr("Toronto"), "TOR");
  });

  it("expands aliases for head-to-head matching", () => {
    assert.ok(wnbaAbbrAliases("LV").includes("LVA"));
    assert.ok(wnbaAbbrAliases("LVA").includes("LV"));
  });

  it("uses ESPN logo paths for all franchises", () => {
    for (const team of ["LVA", "NYL", "WAS", "LAS", "PHO", "GSV", "TOR", "POR", "MIN", "SEA"]) {
      const darkUrl = teamLogoUrl(team, "dark");
      const lightUrl = teamLogoUrl(team, "light");
      assert.match(darkUrl, /\/teamlogos\/wnba\/500-dark\/[a-z0-9]+\.png$/);
      assert.match(lightUrl, /\/teamlogos\/wnba\/500\/[a-z0-9]+\.png$/);
      assert.doesNotMatch(darkUrl, /\/scoreboard\//);
    }
  });

  it("serves a lighter Toronto mark for dark UI surfaces", () => {
    assert.equal(
      teamLogoUrl("TOR", "dark"),
      "https://a.espncdn.com/i/teamlogos/wnba/500-dark/tor.png",
    );
    assert.equal(
      teamLogoUrl("TOR", "light"),
      "https://a.espncdn.com/i/teamlogos/wnba/500/tor.png",
    );
  });
});

describe("wnba matchup insights", () => {
  it("builds recent form lines when game logs exist", () => {
    const line = buildOverviewTeamRecentContextLine("wnba", "NYL", "DAL");
    assert.ok(line?.startsWith("Recent form:"));
  });

  it("builds head-to-head context for known rivals", () => {
    const line = buildOverviewRecentGameContextLine("wnba", "MIN", "SEA");
    assert.ok(line && line.length > 10);
  });
});
