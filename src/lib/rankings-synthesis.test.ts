import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_RANKINGS_HIGHLIGHT_CARDS,
  buildRankingsSynthesis,
  featuredOfficialKeysFromSynthesis,
  officialShowcaseKey,
} from "@/lib/rankings-synthesis";
import { LEAGUES } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeRef(
  slug: string,
  overrides: Partial<RefProfile> = {},
): RefProfile {
  return {
    slug,
    name: slug,
    number: 1,
    games: 40,
    role: "referee",
    avgTotalPoints: 6,
    overRate: 0.4,
    avgFouls: 10,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    ...overrides,
  };
}

function makeStats(refs: RefProfile[]): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2026-07-13",
      seasons: ["2024-25"],
      leagueAvgTotal: 6,
      leagueAvgFouls: 10,
      leagueOverBaseline: 6.3,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: true,
    },
    refs,
    teamSplits: {},
  };
}

function bettingStats(
  overWins: number,
  overLosses: number,
  atsWins: number,
  atsLosses: number,
) {
  return {
    linesAvailable: true,
    homeTeamRecord: { wins: 20, losses: 20, pushes: 0 },
    homeTeamAts: { wins: atsWins, losses: atsLosses, pushes: 0 },
    avgHomeScore: 3,
    avgRoadScore: 3,
    avgHomeMargin: 0,
    overUnder: {
      overall: { wins: overWins, losses: overLosses, pushes: 0 },
      buckets: [],
    },
    spreadBuckets: [],
  };
}

describe("buildRankingsSynthesis", () => {
  it("does not repeat the same official across insight cards", () => {
    const hiff = makeRef("stephen-hiff", {
      name: "Stephen Hiff",
      overRate: 0.58,
      totalPointsDelta: 0.35,
      bettingStats: bettingStats(22, 8, 22, 8),
      foulsDelta: 1.1,
      nhlAnalytics: {
        minorsDelta: 1.1,
        avgMinorsPerGame: 5.9,
        overtimeRate: 0.2,
        overtimeGames: 8,
        avgMinorImbalance: 1.2,
        balancedGameRate: 0.4,
        balanceKind: "asymmetric",
      },
    });
    const refs = [
      makeRef("carter-sandlak", {
        name: "Carter Sandlak",
        totalPointsDelta: 0.3,
      }),
      hiff,
      makeRef("mike-leggo", {
        name: "Mike Leggo",
        bettingStats: bettingStats(10, 20, 18, 12),
      }),
      makeRef("steve-kozari", {
        name: "Steve Kozari",
        foulsDelta: 0.9,
        nhlAnalytics: {
          minorsDelta: 0.9,
          avgMinorsPerGame: 5.9,
          overtimeRate: 0.2,
          overtimeGames: 8,
          avgMinorImbalance: 1.2,
          balancedGameRate: 0.4,
          balanceKind: "asymmetric",
        },
      }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl);
    const slugs = synthesis.insights
      .map((insight) => insight.refSlug)
      .filter(Boolean);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(synthesis.insights.filter((i) => i.refSlug === "stephen-hiff").length, 1);
  });

  it("selects the #1 official per anomaly type in pipeline order when all qualify", () => {
    const refs = [
      makeRef("scorer", { name: "Top Scorer", totalPointsDelta: 0.9 }),
      makeRef("over-king", { name: "Over King", overRate: 0.72 }),
      makeRef("ats-king", {
        name: "ATS King",
        bettingStats: bettingStats(20, 10, 24, 6),
      }),
      makeRef("ou-king", {
        name: "OU King",
        bettingStats: bettingStats(24, 6, 12, 12),
      }),
      makeRef("whistle-king", {
        name: "Whistle King",
        foulsDelta: 1.4,
        nhlAnalytics: {
          minorsDelta: 1.4,
          avgMinorsPerGame: 6.4,
          overtimeRate: 0.2,
          overtimeGames: 8,
          avgMinorImbalance: 1.2,
          balancedGameRate: 0.4,
          balanceKind: "asymmetric",
        },
      }),
      makeRef("under-runner", { name: "Under Runner", overRate: 0.42 }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl);
    assert.equal(synthesis.insights.length, MAX_RANKINGS_HIGHLIGHT_CARDS);
    assert.deepEqual(
      synthesis.insights.map((insight) => insight.refSlug),
      ["scorer", "over-king", "ats-king", "ou-king", "whistle-king", "under-runner"],
    );
  });

  it("skips anomaly slots when the top official is already featured", () => {
    const dominant = makeRef("dominant", {
      name: "Dominant Official",
      totalPointsDelta: 0.9,
      overRate: 0.8,
      bettingStats: bettingStats(24, 6, 24, 6),
      foulsDelta: 1.5,
      nhlAnalytics: {
        minorsDelta: 1.5,
        avgMinorsPerGame: 6.5,
        overtimeRate: 0.2,
        overtimeGames: 8,
        avgMinorImbalance: 1.2,
        balancedGameRate: 0.4,
        balanceKind: "asymmetric",
      },
    });
    const refs = [
      dominant,
      makeRef("runner-up-over", { name: "Runner Over", overRate: 0.62 }),
      makeRef("runner-up-ats", {
        name: "Runner ATS",
        bettingStats: bettingStats(18, 12, 20, 10),
      }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl);
    const slugs = synthesis.insights.map((insight) => insight.refSlug);
    assert.equal(slugs[0], "dominant");
    assert.ok(!slugs.slice(1).includes("dominant"));
    assert.ok(slugs.includes("runner-up-over"));
  });

  it("omits cards when fewer than six unique officials meet high-confidence thresholds", () => {
    const refs = [
      makeRef("only-scorer", { name: "Only Scorer", totalPointsDelta: 0.5 }),
      makeRef("weak-over", { name: "Weak Over", overRate: 0.51 }),
      makeRef("weak-whistle", { name: "Weak Whistle", foulsDelta: 0.2 }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl, {
      maxCards: MAX_RANKINGS_HIGHLIGHT_CARDS,
    });
    assert.equal(synthesis.insights.length, 3);
    assert.equal(synthesis.insights[0]?.refSlug, "only-scorer");
    assert.equal(
      new Set(synthesis.insights.map((insight) => insight.refSlug)).size,
      3,
    );
  });

  it("respects maxCards without backfilling with repeated officials", () => {
    const refs = Array.from({ length: 6 }, (_, index) =>
      makeRef(`official-${index}`, {
        name: `Official ${index}`,
        totalPointsDelta: 0.4 + index * 0.05,
        overRate: 0.55 + index * 0.02,
      }),
    );

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl, {
      maxCards: 2,
    });
    assert.equal(synthesis.insights.length, 2);
    assert.equal(
      new Set(synthesis.insights.map((insight) => insight.refSlug)).size,
      2,
    );
  });

  it("excludes cross-league officials via excludeOfficialKeys", () => {
    const refs = [
      makeRef("shawn-hochuli-83", {
        name: "Shawn Hochuli",
        totalPointsDelta: 0.8,
        overRate: 0.7,
      }),
      makeRef("other-ref", {
        name: "Other Ref",
        totalPointsDelta: 0.5,
        overRate: 0.6,
      }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nfl, {
      excludeOfficialKeys: new Set([officialShowcaseKey({ name: "Shawn Hochuli" })]),
    });

    assert.ok(
      synthesis.insights.every(
        (insight) => insight.refName !== "Shawn Hochuli",
      ),
    );
    assert.equal(synthesis.insights[0]?.refSlug, "other-ref");
  });

  it("counts officials at the scoring threshold in the league summary", () => {
    const refs = [
      makeRef("carter-sandlak", {
        name: "Carter Sandlak",
        totalPointsDelta: 0.3,
      }),
      makeRef("low-scorer", { totalPointsDelta: -0.4 }),
      makeRef("neutral", { totalPointsDelta: 0.1 }),
    ];

    const synthesis = buildRankingsSynthesis(makeStats(refs), LEAGUES.nhl);
    assert.match(synthesis.leagueSummary, /^1 of 3/);
    assert.match(synthesis.leagueSummary, /1 trend lower/);
  });

  it("aligns whistle highlight stat value and body for negative deltas", () => {
    const stats = makeStats([
      makeRef("scorer", { name: "Top Scorer", totalPointsDelta: 0.9 }),
      makeRef("over-king", { name: "Over King", overRate: 0.72 }),
      makeRef("intae-hwang-73", {
        name: "Intae Hwang",
        foulsDelta: -2,
        avgFouls: 37.5,
      }),
    ]);
    stats.meta.atsAvailable = false;

    const synthesis = buildRankingsSynthesis(stats, LEAGUES.nba);
    const whistleCard = synthesis.insights.find((insight) => insight.id === "top-whistle");
    assert.ok(whistleCard);
    assert.equal(whistleCard?.statValue, "-2.0");
    assert.match(whistleCard?.body ?? "", /below average/i);
    assert.doesNotMatch(whistleCard?.body ?? "", /above average/i);
    assert.match(whistleCard?.title ?? "", /lightest/i);
  });
});

describe("buildRankingsSynthesisAcrossLeagues", () => {
  it("features the same person at most once across sequential league builds", () => {
    const nbaStats = makeStats([
      makeRef("scott-foster-48", {
        name: "Scott Foster",
        totalPointsDelta: 0.7,
        overRate: 0.68,
      }),
    ]);
    const nflStats = makeStats([
      makeRef("scott-foster-48", {
        name: "Scott Foster",
        totalPointsDelta: 0.65,
        overRate: 0.66,
        nflAnalytics: {
          avgFlagsPerGame: 12,
          flagsDelta: 2.5,
          avgPenaltyYardsPerGame: 90,
          penaltyYardsDelta: 10,
          avgFlagImbalance: 1.2,
          balancedGameRate: 0.4,
          balanceKind: "asymmetric",
        },
      }),
      makeRef("dale-shaw-0", {
        name: "Dale Shaw",
        totalPointsDelta: 0.5,
        overRate: 0.6,
        nflAnalytics: {
          avgFlagsPerGame: 11,
          flagsDelta: 2.1,
          avgPenaltyYardsPerGame: 85,
          penaltyYardsDelta: 8,
          avgFlagImbalance: 1.1,
          balancedGameRate: 0.4,
          balanceKind: "asymmetric",
        },
      }),
    ]);

    const nbaSynth = buildRankingsSynthesis(nbaStats, LEAGUES.nba);
    const exclude = featuredOfficialKeysFromSynthesis(nbaSynth, nbaStats.refs);
    const nflSynth = buildRankingsSynthesis(nflStats, LEAGUES.nfl, {
      excludeOfficialKeys: exclude,
    });

    const names = [...nbaSynth.insights, ...nflSynth.insights]
      .map((insight) => insight.refName)
      .filter(Boolean);
    assert.equal(new Set(names).size, names.length);
    assert.equal(names.filter((name) => name === "Scott Foster").length, 1);
  });
});
