import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeagueHomeInsights,
  buildLeaguePulseInsights,
  LEAGUE_PULSE_LIMIT,
} from "@/lib/league-home-insights";
import { LEAGUES } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { AssignmentsFile, RefProfile, RefStatsFile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "sample-ref",
    name: "Sample Ref",
    number: 12,
    games: 120,
    avgTotalPoints: 44,
    overRate: 0.58,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 2.4,
    foulsDelta: 2.5,
    nflAnalytics: {
      avgFlagsPerGame: 14,
      flagsDelta: 2.2,
      avgPenaltyYardsPerGame: 110,
      penaltyYardsDelta: 8,
      avgFlagImbalance: 1.1,
      balancedGameRate: 0.42,
      balanceKind: "balancer",
    },
    seasons: ["2024-25"],
    recentGames: [],
    ...overrides,
  };
}

function makeStats(refs: RefProfile[]): RefStatsFile {
  return {
    refs,
    teamSplits: {},
    meta: {
      seasons: ["2024-25"],
      minSampleSize: 30,
      leagueOverBaseline: 45,
      leagueAvgTotal: 44,
      leagueAvgFouls: 12,
      lastUpdated: "2026-01-01",
      source: "espn",
      atsAvailable: true,
    },
  };
}

const emptyAssignments: AssignmentsFile = {
  date: "2026-01-01",
  games: [],
  scheduledGames: [],
  source: "espn",
  lastUpdated: "2026-01-01",
};

describe("league-home-insights", () => {
  it("builds up to three pulse insights with whistle priority", () => {
    const stats = makeStats([
      makeRef({
        slug: "whistle-ref",
        foulsDelta: 3.1,
        nflAnalytics: {
          avgFlagsPerGame: 15,
          flagsDelta: 3.1,
          avgPenaltyYardsPerGame: 115,
          penaltyYardsDelta: 10,
          avgFlagImbalance: 1.3,
          balancedGameRate: 0.38,
          balanceKind: "balancer",
        },
      }),
      makeRef({ slug: "over-ref", overRate: 0.62, foulsDelta: 0.2 }),
      makeRef({ slug: "ou-ref", overRate: 0.55, foulsDelta: 0.4 }),
    ]);
    const pulse = buildLeaguePulseInsights(stats, LEAGUES.nfl);
    assert.ok(pulse.length <= LEAGUE_PULSE_LIMIT);
    assert.equal(pulse[0]?.id, "top-whistle");
    assert.match(pulse[0]?.title ?? "", /whistle bias/i);
  });

  it("bundles pulse, matchups, and spotlights without duplicate pulse refs", () => {
    const stats = makeStats([
      makeRef(),
      makeRef({ slug: "other-ref", name: "Other Ref", foulsDelta: 1.8 }),
    ]);
    const bundle = buildLeagueHomeInsights({
      leagueId: "nfl",
      refStats: stats,
      assignments: {
        ...emptyAssignments,
        games: [
          {
            id: "game-1",
            matchup: "KC @ BUF",
            awayTeam: "KC",
            homeTeam: "BUF",
            league: "NFL",
            crew: [{ name: "Sample Ref", number: 12, role: "referee" }],
          },
        ],
      },
    });
    assert.ok(bundle.pulse.length > 0);
    assert.ok(bundle.matchups.length > 0);
    const pulseSlugs = new Set(bundle.pulse.map((item) => item.refSlug));
    for (const spotlight of bundle.spotlights) {
      if (spotlight.refSlug) {
        assert.equal(pulseSlugs.has(spotlight.refSlug), false);
      }
    }
  });

  it("builds verified WNBA home insights from ref stats like other pro leagues", () => {
    const { stats } = loadLeagueStats("wnba");
    const bundle = buildLeagueHomeInsights({
      leagueId: "wnba",
      refStats: stats,
      assignments: {
        ...emptyAssignments,
        games: [
          {
            id: "401857083",
            matchup: "LVA @ TOR",
            awayTeam: "LVA",
            homeTeam: "TOR",
            league: "WNBA",
            slateDate: "2026-07-21",
            crew: [],
          },
        ],
      },
    });

    assert.ok(bundle.pulse.length > 0);
    assert.ok(bundle.matchups.length > 0);
    assert.ok(bundle.spotlights.length > 0);
    assert.match(bundle.pulse[0]?.title ?? "", /whistle|divergence|split|bias/i);
    assert.match(bundle.matchups[0]?.body ?? "", /Refs not assigned yet/);
    assert.ok(bundle.spotlights[0]?.refSlug);
  });
});
