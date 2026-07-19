import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
  it("builds highlight cards for extreme officials that stay extreme after shrinkage", () => {
    const stats = makeStats([
      makeRef({ slug: "quiet", name: "Quiet Ref", referee_gsni: 1.8 }),
      makeRef({ slug: "heavy", name: "Heavy Ref", referee_gsni: -1.8 }),
    ]);
    const highlights = buildGsniResearchHighlights(stats);
    assert.ok(highlights.length > 0, "expected GSNI highlight cards");
    for (const card of highlights) {
      assert.ok(card.gsni !== null);
      assert.ok(card.band === "quiet" || card.band === "heavy");
      assert.match(card.headline, /clutch/i);
      assert.ok(card.gsniShrinkageTooltip);
    }
  });

  it("lists officials with tracked high-leverage GSNI samples", () => {
    const stats = getRefStats();
    const rows = buildGsniResearchRows(stats);
    assert.ok(rows.length > 10, `expected GSNI rows, got ${rows.length}`);
    const cleared = rows.filter((row) => row.gateCleared);
    assert.ok(cleared.length > 0, "expected gate-cleared GSNI rows");
    for (const row of cleared) {
      assert.ok(row.gsni !== null);
      assert.ok(row.highLeverageMinutes >= 25);
      assert.ok(row.gsniObserved !== null);
    }
  });
});
