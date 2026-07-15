import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTrustBarStats, formatTrustBarSegment } from "@/lib/trust-bar-stats";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

function sampleOverview(
  overrides: Partial<CrossLeagueOverview> = {},
): CrossLeagueOverview {
  return {
    totalRefs: 577,
    totalGames: 36432,
    liveLeagueCount: 5,
    catalogCompetitionCount: 20,
    whistleEventsLogged: 697096,
    whistleLabel: "Whistle events logged",
    leagueCards: [
      {
        leagueId: "nfl",
        label: "NFL",
        shortLabel: "NFL",
        href: "/nfl",
        refCount: 264,
        gameCount: 6825,
        seasonCount: 26,
        whistlePerGame: 12.5,
        whistleLabel: "Flags per game",
        scorePerGame: 46,
        scoreLabel: "points per game",
        whistleBar: 0.8,
        scoreBar: 0.7,
        analyticsUnlocked: true,
      },
      {
        leagueId: "nba",
        label: "NBA",
        shortLabel: "NBA",
        href: "/nba",
        refCount: 109,
        gameCount: 11979,
        seasonCount: 10,
        whistlePerGame: 40.8,
        whistleLabel: "Fouls per game",
        scorePerGame: 222,
        scoreLabel: "points per game",
        whistleBar: 0.82,
        scoreBar: 0.89,
        analyticsUnlocked: true,
      },
    ],
    insightCards: [],
    topStories: [],
    topStoriesStatus: "generated",
    topStoriesGeneratedAt: null,
    upcomingSlate: {
      inSeason: false,
      hasLiveCrews: false,
      totalGames: 0,
      totalScheduled: 0,
      lastUpdated: null,
      games: [],
      leagueNotes: [],
    },
    allRefs: [],
    ...overrides,
  };
}

describe("trust bar stats", () => {
  it("derives totals and deepest season span from overview data", () => {
    const stats = buildTrustBarStats(sampleOverview());
    assert.equal(stats.gamesAnalyzed, 36432);
    assert.equal(stats.officials, 577);
    assert.equal(stats.seasons, 26);
  });

  it("formats trust bar segments with locale counts", () => {
    const segments = formatTrustBarSegment(buildTrustBarStats(sampleOverview()));
    assert.deepEqual(segments, [
      "36,432 Games Analyzed",
      "577 Officials",
      "26 Seasons",
      "Historical Archive",
    ]);
  });
});
