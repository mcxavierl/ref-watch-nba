import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { leagueDataSourceBannerMessage } from "@/lib/data-source-banner";
import { unverifiedBannerMessage } from "@/lib/league-verification";

describe("CBB data source surfaces", () => {
  it("never returns preview banner copy for CBB", () => {
    assert.equal(
      leagueDataSourceBannerMessage("cbb", {
        source: "synthetic",
        seasons: [],
      }),
      null,
    );
    assert.equal(
      unverifiedBannerMessage("cbb", {
        source: "synthetic",
        seasons: [],
      }),
      "",
    );
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
