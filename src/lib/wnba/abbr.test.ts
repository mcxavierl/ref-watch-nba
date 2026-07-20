import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWnbaAbbr, wnbaAbbrAliases } from "@/lib/wnba/abbr";
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
