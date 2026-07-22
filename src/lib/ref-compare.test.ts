import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildCompareMetricRows,
  compareLeagueHref,
  compareSupportsGsni,
  parseCompareLeagueParam,
} from "@/lib/ref-compare";
import type { CompareRefBundle } from "@/lib/ref-compare";
import { LEAGUES } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeBundle(
  leagueId: "nba" | "nfl",
  profile: Partial<RefProfile>,
): CompareRefBundle {
  const meta: RefStatsFile["meta"] = {
    lastUpdated: "2026-01-01",
    seasons: ["2024"],
    leagueAvgTotal: 220,
    leagueAvgFouls: 40,
    leagueOverBaseline: 220,
    minSampleSize: 20,
    source: "seeded",
    atsAvailable: true,
  };

  return {
    leagueId,
    slug: profile.slug ?? "test-ref",
    profile: {
      slug: "test-ref",
      name: "Test Ref",
      number: 12,
      games: 80,
      avgTotalPoints: 220,
      overRate: 0.52,
      avgFouls: 40,
      homeCoverRate: null,
      totalPointsDelta: 1.2,
      foulsDelta: 0.8,
      seasons: ["2024"],
      recentGames: [],
      ...profile,
    },
    meta,
    config: LEAGUES[leagueId],
    scopeLabel: "Last 10 seasons",
  };
}

describe("ref compare diagnostics", () => {
  it("builds GSNI row with shared gauge scores for NBA/NFL pairs", () => {
    const left = makeBundle("nba", { referee_gsni: 1.4, gsniHighLeverageMinutes: 120 });
    const right = makeBundle("nba", {
      slug: "peer",
      referee_gsni: -0.9,
      gsniHighLeverageMinutes: 110,
    });

    const rows = buildCompareMetricRows(left, right);
    const gsni = rows.find((row) => row.id === "gsni");
    assert.ok(gsni);
    assert.equal(gsni?.kind, "gsni");
    assert.ok(gsni?.gsniA !== null);
    assert.ok(gsni?.gsniB !== null);
  });

  it("parses league deep-link params and hrefs", () => {
    assert.equal(parseCompareLeagueParam("nfl"), "nfl");
    assert.equal(parseCompareLeagueParam("invalid"), null);
    assert.equal(compareLeagueHref("nfl"), "/compare?league=nfl");
  });

  it("limits GSNI support to NBA and NFL", () => {
    assert.equal(compareSupportsGsni("nba"), true);
    assert.equal(compareSupportsGsni("nhl"), false);
  });

  it("surfaces compare in the header and preserves versus layout", () => {
    const header = readFileSync("src/components/SiteHeader.tsx", "utf8");
    const nav = readFileSync("src/components/LeagueSectionNav.tsx", "utf8");
    const view = readFileSync("src/components/RefCompareView.tsx", "utf8");
    assert.match(header, /href="\/compare"/);
    assert.doesNotMatch(nav, /Compare Officials/);
    assert.doesNotMatch(nav, /compareLeagueHref/);
    assert.match(view, /ref-compare-versus/);
    assert.match(view, /CompareDualGsniGauge/);
  });
});
