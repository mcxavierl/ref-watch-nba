import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWnbaAbbr, wnbaAbbrAliases } from "@/lib/wnba/abbr";
import { teamLogoUrl } from "@/lib/wnba/teams";
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

  it("expands aliases for head-to-head matching", () => {
    assert.ok(wnbaAbbrAliases("LV").includes("LVA"));
    assert.ok(wnbaAbbrAliases("LVA").includes("LV"));
  });

  it("uses ESPN primary logo paths for all franchises", () => {
    for (const team of ["LVA", "NYL", "WAS", "LAS", "PHO", "GSV", "TOR", "POR", "MIN", "SEA"]) {
      const url = teamLogoUrl(team);
      assert.match(url, /\/teamlogos\/wnba\/500\/[a-z0-9]+\.png$/);
      assert.doesNotMatch(url, /\/scoreboard\//);
    }
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
