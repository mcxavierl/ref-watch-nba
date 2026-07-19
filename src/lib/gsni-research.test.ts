import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GSNI_THRESHOLD } from "@/lib/gsni";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  compareGsniByAbsDesc,
  gsniConfidenceInterval,
  gsniQualifiesHighVariance,
  gsniResearchConfigForLeague,
  gsniStandardError,
  leagueSupportsGsniResearch,
} from "@/lib/gsni-research";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile>): RefProfile {
  return {
    slug: "test-ref",
    name: "Test Ref",
    number: 1,
    games: 120,
    avgTotalPoints: 45,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    gsniSampleGames: 120,
    gsniHighLeverageMinutes: 180,
    ...overrides,
  };
}

function makeStats(refs: RefProfile[]): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2026-01-01",
      seasons: ["2024"],
      leagueAvgTotal: 45,
      leagueAvgFouls: 13,
      leagueOverBaseline: 44,
      minSampleSize: 10,
      source: "seeded",
      atsAvailable: false,
    },
    refs,
    teamSplits: {},
  };
}

describe("shared GSNI research", () => {
  it("enables GSNI research for nfl and nba only", () => {
    assert.equal(leagueSupportsGsniResearch("nfl"), true);
    assert.equal(leagueSupportsGsniResearch("nba"), true);
    assert.equal(leagueSupportsGsniResearch("nhl"), false);
    assert.equal(leagueSupportsGsniResearch("epl"), false);
  });

  it("uses GSNI_THRESHOLD at 1 standard deviation", () => {
    assert.equal(GSNI_THRESHOLD, 1);
    assert.equal(gsniQualifiesHighVariance(1), true);
    assert.equal(gsniQualifiesHighVariance(-1.2), true);
    assert.equal(gsniQualifiesHighVariance(0.9), false);
    assert.equal(gsniQualifiesHighVariance(0.2), false);
  });

  it("sorts by absolute index score descending", () => {
    assert.equal(compareGsniByAbsDesc(-1.9, 1.2), -1);
    assert.equal(compareGsniByAbsDesc(1.2, -1.9), 1);
    assert.equal(compareGsniByAbsDesc(1.5, -1.5), 0);
  });

  it("builds confidence intervals from volatility as standard error", () => {
    assert.equal(gsniStandardError(0.4), 0.4);
    assert.deepEqual(gsniConfidenceInterval(1.2, 0.4), {
      lower: 0.8,
      upper: 1.6,
    });
  });

  it("returns only high-variance gate-cleared rows sorted by |score|", () => {
    const config = gsniResearchConfigForLeague("nba");
    assert.ok(config);
    const stats = makeStats([
      makeRef({ slug: "quiet", name: "Quiet Ref", referee_gsni: 1.8, referee_gsni_volatility: 0.35 }),
      makeRef({ slug: "heavy", name: "Heavy Ref", referee_gsni: -1.9, referee_gsni_volatility: 0.42 }),
      makeRef({ slug: "typical", name: "Typical Ref", referee_gsni: 0.3 }),
      makeRef({
        slug: "pending",
        name: "Pending Ref",
        referee_gsni: 2.1,
        gsniHighLeverageMinutes: 10,
      }),
    ]);
    const rows = buildGsniResearchRows(stats, config!);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.refSlug, "heavy");
    assert.equal(rows[1]?.refSlug, "quiet");
    for (const row of rows) {
      assert.equal(row.highVariance, true);
      assert.ok(row.rawScore !== null);
      assert.equal(row.rawScore, row.gsniObserved);
      assert.equal(row.standardError, row.volatility);
      assert.ok(row.confidenceInterval);
      assert.ok(row.gsni !== null);
      assert.ok(Math.abs(row.gsni!) >= GSNI_THRESHOLD);
    }
  });

  it("builds highlight cards for high-variance officials", () => {
    const config = gsniResearchConfigForLeague("nba");
    assert.ok(config);
    const stats = makeStats([
      makeRef({ slug: "quiet", name: "Quiet Ref", referee_gsni: 1.8 }),
      makeRef({ slug: "heavy", name: "Heavy Ref", referee_gsni: -1.9 }),
    ]);
    const highlights = buildGsniResearchHighlights(stats, config!);
    assert.ok(highlights.length >= 1);
    for (const card of highlights) {
      assert.equal(card.highVariance, true);
      assert.match(card.headline, /^[+-]?\d+\.\d:/);
    }
  });
});
