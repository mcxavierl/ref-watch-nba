import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  americanToImpliedProbability,
  computeEdgeScore,
  computeFindingEvSnapshot,
  computeLwisProbabilityAdjustment,
  DEFAULT_STANDARD_JUICE,
  EDGE_NEGATIVE_THRESHOLD,
  EDGE_POSITIVE_THRESHOLD,
  edgeTone,
} from "@/lib/ev-calculator";
import type { RefStatsFile } from "@/lib/types";

describe("ev-calculator", () => {
  it("converts -110 American odds to 52.38% implied probability", () => {
    const implied = americanToImpliedProbability(-110);
    assert.ok(Math.abs(implied - 0.5238) < 0.0001);
  });

  it("computes edge score as (adjusted - implied) * 100", () => {
    assert.equal(computeEdgeScore(0.55, 0.5238), 2.62);
    assert.equal(computeEdgeScore(0.5, 0.5238), -2.38);
  });

  it("applies LWIS bump for high-impact over-leaning officials", () => {
    const none = computeLwisProbabilityAdjustment({
      isHighImpactOutlier: false,
      favorsOver: true,
      historicalOverDelta: 0.05,
    });
    assert.equal(none, 0);

    const bump = computeLwisProbabilityAdjustment({
      isHighImpactOutlier: true,
      favorsOver: true,
      historicalOverDelta: 0.05,
      lwisZScore: 2.4,
    });
    assert.ok(bump >= 0.025);
    assert.ok(bump <= 0.05);
  });

  it("flags edge tone thresholds at +/- 2%", () => {
    assert.equal(edgeTone(EDGE_POSITIVE_THRESHOLD + 0.1), "positive");
    assert.equal(edgeTone(EDGE_NEGATIVE_THRESHOLD - 0.1), "negative");
    assert.equal(edgeTone(0), "neutral");
  });

  it("builds a positive edge for high-impact over ref vs -110 market", () => {
    const stats: RefStatsFile = {
      meta: {
        lastUpdated: "2026-07-13",
        seasons: ["2024-25"],
        leagueAvgTotal: 225,
        leagueAvgFouls: 40,
        leagueOverBaseline: 0.5,
        minSampleSize: 10,
        source: "seeded",
        atsAvailable: true,
      },
      refs: [
        {
          slug: "high-over-42",
          name: "High Over",
          number: 42,
          games: 40,
          avgTotalPoints: 232,
          overRate: 0.58,
          avgFouls: 40,
          homeCoverRate: null,
          totalPointsDelta: 7,
          foulsDelta: 0,
          seasons: ["2024-25"],
          recentGames: [],
          bettingStats: {
            linesAvailable: true,
            homeTeamRecord: { wins: 20, losses: 20, pushes: 0 },
            homeTeamAts: { wins: 22, losses: 18, pushes: 0 },
            avgHomeScore: 112,
            avgRoadScore: 110,
            avgHomeMargin: 2,
            overUnder: {
              overall: { wins: 24, losses: 16, pushes: 0 },
              buckets: [],
            },
            spreadBuckets: [],
          },
        },
      ],
      teamSplits: {},
    };

    const finding = {
      id: "ou-ats-edge",
      category: "ou-edge" as const,
      headline: "High Over leans overs",
      summary: "Test",
      stats: [],
      sampleNote: "40 games",
      links: [{ label: "High Over", href: "/refs/high-over-42" }],
    };

    const snapshot = computeFindingEvSnapshot(
      finding,
      stats,
      "nba",
      ["2024-25"],
      {
        odds: {
          lastUpdated: "2026-07-13",
          source: "benchmark",
          lines: [],
        },
        highImpactSlugs: new Set(["high-over-42"]),
      },
    );

    assert.ok(snapshot);
    assert.equal(snapshot.marketOdds, DEFAULT_STANDARD_JUICE);
    assert.ok(snapshot.lwisAdjustment > 0);
    assert.ok(snapshot.edgeScore > EDGE_POSITIVE_THRESHOLD);
  });
});
