import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectRefTeamScoringExtremes } from "@/lib/findings-shared";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeRef(
  slug: string,
  teamStats: Record<string, { games: number; avgTotalPoints: number }>,
): RefProfile {
  return {
    slug,
    name: slug,
    number: 1,
    games: 100,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    teamStats: Object.fromEntries(
      Object.entries(teamStats).map(([team, st]) => [
        team,
        {
          games: st.games,
          avgTotalPoints: st.avgTotalPoints,
          avgFoulDifferential: 0,
          overRate: 0.5,
          winRate: 0.5,
        },
      ]),
    ),
  };
}

function makeStats(refs: RefProfile[]): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2025-01-01",
      seasons: ["2024-25"],
      leagueAvgTotal: 220,
      leagueAvgFouls: 40,
      leagueOverBaseline: 0.5,
      minSampleSize: 8,
      source: "seeded",
      atsAvailable: false,
    },
    refs,
    teamSplits: {},
  };
}

describe("collectRefTeamScoringExtremes", () => {
  it("returns hottest and coldest from different refs", () => {
    const stats = makeStats([
      makeRef("cody-beach", {
        TOR: { games: 10, avgTotalPoints: 7.5 },
        BOS: { games: 10, avgTotalPoints: 4.0 },
      }),
      makeRef("other-ref", {
        NYR: { games: 10, avgTotalPoints: 5.0 },
      }),
    ]);

    const result = collectRefTeamScoringExtremes(stats, 8);
    assert.ok(result);
    assert.equal(result.hottest.ref.slug, "cody-beach");
    assert.equal(result.hottest.team, "TOR");
    assert.equal(result.coldest.ref.slug, "other-ref");
    assert.notEqual(result.hottest.ref.slug, result.coldest.ref.slug);
  });

  it("picks coldest from a second ref when one ref owns both global extremes", () => {
    const stats = makeStats([
      makeRef("high-variance-ref", {
        TOR: { games: 10, avgTotalPoints: 8.0 },
        BOS: { games: 10, avgTotalPoints: 3.0 },
      }),
      makeRef("moderate-ref", {
        NYR: { games: 10, avgTotalPoints: 5.5 },
      }),
    ]);

    const result = collectRefTeamScoringExtremes(stats, 8);
    assert.ok(result);
    assert.equal(result.hottest.ref.slug, "high-variance-ref");
    assert.equal(result.hottest.avgTotal, 8.0);
    assert.equal(result.coldest.ref.slug, "moderate-ref");
    assert.equal(result.coldest.avgTotal, 5.5);
    assert.notEqual(result.hottest.ref.slug, result.coldest.ref.slug);
  });

  it("returns null when only one ref has qualifying team stats", () => {
    const stats = makeStats([
      makeRef("solo-ref", {
        TOR: { games: 10, avgTotalPoints: 7.0 },
        BOS: { games: 10, avgTotalPoints: 4.0 },
      }),
    ]);

    assert.equal(collectRefTeamScoringExtremes(stats, 8), null);
  });
});
