import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GSNI_THRESHOLD } from "@/lib/gsni";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
} from "@/lib/nfl/gsni-research";
import { getRefStats } from "@/lib/nfl/data";
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

describe("NFL GSNI research", () => {
  it("builds highlight cards for high-variance officials", () => {
    const stats = makeStats([
      makeRef({ slug: "quiet", name: "Quiet Ref", referee_gsni: 1.8 }),
      makeRef({ slug: "heavy", name: "Heavy Ref", referee_gsni: -1.8 }),
    ]);
    const highlights = buildGsniResearchHighlights(stats);
    assert.ok(highlights.length > 0, "expected GSNI highlight cards");
    for (const card of highlights) {
      assert.ok(card.gsni !== null);
      assert.equal(card.highVariance, true);
      assert.ok(card.rawScore !== null);
      assert.match(card.headline, /^[+-]?\d+\.\d:/);
      assert.ok(card.gsniShrinkageTooltip);
    }
  });

  it("lists only high-variance gate-cleared officials", () => {
    const stats = getRefStats();
    const rows = buildGsniResearchRows(stats);
    assert.ok(rows.length > 0, `expected high-variance GSNI rows, got ${rows.length}`);
    for (const row of rows) {
      assert.equal(row.highVariance, true);
      assert.ok(row.gsni !== null);
      assert.ok(Math.abs(row.gsni!) >= GSNI_THRESHOLD);
      assert.ok(row.highLeverageMinutes >= 25);
      assert.ok(row.rawScore !== null);
      assert.equal(row.rawScore, row.gsniObserved);
      if (row.standardError !== null) {
        assert.ok(row.confidenceInterval);
        assert.equal(row.standardError, row.volatility);
      }
    }
  });
});
