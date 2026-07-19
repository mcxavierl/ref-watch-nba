import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
  gsniResearchConfigForLeague,
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

  it("builds highlight cards for extreme officials", () => {
    const config = gsniResearchConfigForLeague("nba");
    assert.ok(config);
    const stats = makeStats([
      makeRef({ slug: "quiet", name: "Quiet Ref", referee_gsni: 1.8 }),
      makeRef({ slug: "heavy", name: "Heavy Ref", referee_gsni: -1.9 }),
    ]);
    const highlights = buildGsniResearchHighlights(stats, config!);
    assert.ok(highlights.length >= 1);
    const rows = buildGsniResearchRows(stats, config!);
    assert.ok(rows.length >= 2);
  });
});
