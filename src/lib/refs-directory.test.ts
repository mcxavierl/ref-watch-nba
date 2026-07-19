import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRefsDirectoryContext,
  buildRefsSpotlightCards,
  computeOverRateMean,
  filterRefsDiscovery,
  selectSpotlightRefs,
  sortRefsByOutlierDeviation,
} from "@/lib/refs-directory";
import { LEAGUES } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> & Pick<RefProfile, "slug" | "name">): RefProfile {
  return {
    number: 10,
    games: 40,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    ...overrides,
  };
}

describe("selectSpotlightRefs", () => {
  const refs = [
    makeRef({ slug: "a", name: "Alpha", overRate: 0.62, games: 30 }),
    makeRef({ slug: "b", name: "Bravo", overRate: 0.58, games: 50 }),
    makeRef({ slug: "c", name: "Charlie", overRate: 0.41, games: 70 }),
    makeRef({ slug: "d", name: "Delta", overRate: 0.38, games: 45 }),
  ];

  it("returns top 3 highest over rates", () => {
    const spotlight = selectSpotlightRefs(refs, "over-high", 3);
    assert.deepEqual(
      spotlight.map((ref) => ref.slug),
      ["a", "b", "c"],
    );
  });

  it("returns top 3 lowest over rates for under tab", () => {
    const spotlight = selectSpotlightRefs(refs, "over-low", 3);
    assert.deepEqual(
      spotlight.map((ref) => ref.slug),
      ["d", "c", "b"],
    );
  });

  it("returns top 3 by games for experienced tab", () => {
    const spotlight = selectSpotlightRefs(refs, "experienced", 3);
    assert.deepEqual(
      spotlight.map((ref) => ref.slug),
      ["c", "b", "d"],
    );
  });
});

describe("filterRefsDiscovery", () => {
  const refs = [
    makeRef({ slug: "a", name: "Scott Foster", overRate: 0.72 }),
    makeRef({ slug: "b", name: "Tony Brothers", overRate: 0.51 }),
    makeRef({ slug: "c", name: "Marc Davis", overRate: 0.29 }),
  ];

  it("filters by name query", () => {
    const filtered = filterRefsDiscovery(refs, { query: "bro" });
    assert.deepEqual(
      filtered.map((ref) => ref.slug),
      ["b"],
    );
  });

  it("filters whistle outliers from the pool mean", () => {
    const filtered = filterRefsDiscovery(refs, { outliersOnly: true, pool: refs });
    assert.deepEqual(
      filtered.map((ref) => ref.slug),
      ["a", "c"],
    );
  });

  it("includes origin-variance outliers when whistle toggle is on", () => {
    const varianceRefs = [
      makeRef({ slug: "home", name: "Home Ref", overRate: 0.5, originVariance: 0.8 }),
      makeRef({ slug: "away", name: "Away Ref", overRate: 0.5, originVariance: 0.2 }),
    ];
    const filtered = filterRefsDiscovery(varianceRefs, {
      outliersOnly: true,
      pool: varianceRefs,
    });
    assert.deepEqual(
      filtered.map((ref) => ref.slug),
      ["home"],
    );
  });
});

describe("sortRefsByOutlierDeviation", () => {
  it("sorts refs by deviation from mean over rate", () => {
    const refs = [
      makeRef({ slug: "a", name: "A", overRate: 0.7 }),
      makeRef({ slug: "b", name: "B", overRate: 0.5 }),
      makeRef({ slug: "c", name: "C", overRate: 0.1 }),
    ];
    const sorted = sortRefsByOutlierDeviation(refs);
    assert.deepEqual(
      sorted.map((ref) => ref.slug),
      ["c", "a", "b"],
    );
    assert.equal(computeOverRateMean(refs), 0.43333333333333335);
  });
});

describe("buildRefsDirectoryContext", () => {
  it("uses distinct games processed, not summed ref assignments", () => {
    const stats: RefStatsFile = {
      refs: [
        makeRef({ slug: "a", name: "Alpha", games: 80 }),
        makeRef({ slug: "b", name: "Bravo", games: 70 }),
      ],
      teamSplits: {},
      meta: {
        seasons: ["2024-25", "2025-26"],
        leagueAvgTotal: 220,
        leagueAvgFouls: 40,
        leagueOverBaseline: 220,
        minSampleSize: 30,
        refCount: 2,
        totalGamesProcessed: 95,
        lastUpdated: "2026-01-01",
        source: "hybrid",
        atsAvailable: true,
      },
    };

    const ctx = buildRefsDirectoryContext(stats, LEAGUES.nba);
    assert.equal(ctx.meta.totalGameRecords, 95);
    assert.equal(ctx.meta.totalGameRecordsLabel, "95+");
    assert.equal(ctx.meta.qualifiedCount, 2);
  });
});

describe("buildRefsSpotlightCards", () => {
  it("builds three inline insight cards for the active tab", () => {
    const refs = [
      makeRef({ slug: "a", name: "Alpha", overRate: 0.62, games: 30 }),
      makeRef({ slug: "b", name: "Bravo", overRate: 0.58, games: 50 }),
      makeRef({ slug: "c", name: "Charlie", overRate: 0.41, games: 70 }),
    ];
    const cards = buildRefsSpotlightCards(
      refs,
      "over-high",
      {
        seasons: ["2024-25"],
        seasonCount: 1,
        minSampleSize: 10,
        leagueOverBaseline: 225,
        leagueAvgTotal: 220,
        leagueAvgFouls: 40,
        qualifiedCount: 3,
        totalGameRecords: 120,
        totalGameRecordsLabel: "120+",
      },
      LEAGUES.nba,
    );

    assert.equal(cards.length, 3);
    assert.equal(cards[0].entityName, "Alpha");
    assert.equal(cards[0].kind, "ref-outlier");
    assert.equal(cards[0].heroLabel, "Over rate");
    assert.match(cards[0].kicker, /^#1 · Highest over rate$/);
  });
});
