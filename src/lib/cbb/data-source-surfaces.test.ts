import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { leagueDataSourceBannerMessage } from "@/lib/data-source-banner";
import { unverifiedBannerMessage } from "@/lib/league-verification";
import type { RefStatsFile } from "@/lib/types";

function cbbMeta(source: RefStatsFile["meta"]["source"]): RefStatsFile["meta"] {
  return {
    lastUpdated: "2026-01-01",
    seasons: [],
    leagueAvgTotal: 140,
    leagueAvgFouls: 34,
    leagueOverBaseline: 140,
    minSampleSize: 10,
    source,
    atsAvailable: false,
  };
}

describe("CBB data source surfaces", () => {
  it("never returns preview banner copy for CBB", () => {
    assert.equal(
      leagueDataSourceBannerMessage("cbb", cbbMeta("seeded")),
      null,
    );
    assert.equal(unverifiedBannerMessage("cbb", cbbMeta("seeded")), "");
  });

  it("LeagueDataSourceBanner and FindingsSection omit CBB preview messaging", () => {
    const banner = readFileSync("src/components/LeagueDataSourceBanner.tsx", "utf8");
    const findings = readFileSync("src/components/FindingsSection.tsx", "utf8");
    const insights = readFileSync("src/components/InsightsHubPage.tsx", "utf8");

    assert.match(banner, /if \(league === "cbb"\) return null/);
    assert.match(findings, /league !== "CBB"/);
    assert.match(insights, /cbbHasFindings/);
    assert.doesNotMatch(insights, /leagueId === "cbb" \|\| leagueId === "cfb"/);
  });
});
