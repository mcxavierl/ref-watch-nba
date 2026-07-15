import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPulseStripStats } from "@/lib/pulse-strip-stats";
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
      inSeason: true,
      hasLiveCrews: true,
      totalGames: 4,
      totalScheduled: 6,
      lastUpdated: null,
      games: [],
      leagueNotes: [],
    },
    allRefs: [],
    ...overrides,
  };
}

describe("pulse strip stats", () => {
  it("sums live and scheduled slate games for games today", () => {
    const stats = buildPulseStripStats(sampleOverview());
    assert.equal(stats.gamesToday, 10);
  });

  it("computes game-weighted cross-league foul rate", () => {
    const stats = buildPulseStripStats(sampleOverview());
    assert.equal(stats.foulRate, "30.5");
  });

  it("reports verified status", () => {
    const stats = buildPulseStripStats(sampleOverview());
    assert.equal(stats.status, "VERIFIED");
  });
});
