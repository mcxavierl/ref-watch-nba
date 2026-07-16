import test from "node:test";
import assert from "node:assert/strict";
import {
  filterNcaaRefStats,
  gameTouchesLiveNcaaConference,
  LIVE_NCAA_CONFERENCES,
  shouldIngestNcaaGame,
  teamInLiveNcaaConference,
} from "@/lib/ncaa-conference-gate";
import type { RefStatsFile } from "@/lib/types";

test("LIVE_NCAA_CONFERENCES includes all power conferences for CBB launch", () => {
  assert.deepEqual([...LIVE_NCAA_CONFERENCES], [
    "ACC",
    "Big Ten",
    "Big 12",
    "SEC",
    "Big East",
  ]);
});

test("shouldIngestNcaaGame accepts power-conference matchups", () => {
  assert.equal(shouldIngestNcaaGame("cbb", "MICH", "OSU"), true);
  assert.equal(shouldIngestNcaaGame("cbb", "IU", "PUR"), true);
  assert.equal(shouldIngestNcaaGame("cbb", "DUKE", "UNC"), true);
  assert.equal(shouldIngestNcaaGame("cbb", "ALA", "UGA"), true);
  assert.equal(shouldIngestNcaaGame("cbb", "KU", "BAY"), true);
  assert.equal(shouldIngestNcaaGame("cbb", "UCONN", "VILL"), true);
});

test("shouldIngestNcaaGame rejects games outside the live conference gate", () => {
  assert.equal(shouldIngestNcaaGame("cbb", "GONZ", "BYU"), false);
  assert.equal(shouldIngestNcaaGame("cbb", "GONZ", "SFPA"), false);
});

test("teamInLiveNcaaConference maps registry conferences", () => {
  assert.equal(teamInLiveNcaaConference("cbb", "MICH"), true);
  assert.equal(teamInLiveNcaaConference("cbb", "DUKE"), true);
  assert.equal(teamInLiveNcaaConference("cbb", "GONZ"), false);
});

test("filterNcaaRefStats drops refs without live-conference team stats", () => {
  const stats: RefStatsFile = {
    meta: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      seasons: ["2025-26"],
      leagueAvgTotal: 140,
      leagueAvgFouls: 35,
      leagueOverBaseline: 140,
      minSampleSize: 30,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
    },
    refs: [
      {
        slug: "big-ten-ref",
        name: "Big Ten Ref",
        number: 1,
        games: 4,
        avgTotalPoints: 140,
        overRate: 0.5,
        avgFouls: 35,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2025-26"],
        recentGames: [
          {
            gameId: "1",
            date: "2026-01-01",
            season: "2025-26",
            homeTeam: "MICH",
            awayTeam: "OSU",
            totalPoints: 140,
            totalFouls: 35,
            overHit: true,
            raptorsInvolved: false,
            closingTotal: 140,
            homeSpread: 0,
          },
        ],
        teamStats: {
          MICH: {
            games: 4,
            avgFoulDifferential: 0,
            avgTotalPoints: 140,
            overRate: 0.5,
            winRate: 0.5,
          },
        },
      },
      {
        slug: "other-ref",
        name: "Other Ref",
        number: 2,
        games: 2,
        avgTotalPoints: 140,
        overRate: 0.5,
        avgFouls: 35,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2025-26"],
        recentGames: [
          {
            gameId: "2",
            date: "2026-01-02",
            season: "2025-26",
            homeTeam: "GONZ",
            awayTeam: "SFPA",
            totalPoints: 140,
            totalFouls: 35,
            overHit: true,
            raptorsInvolved: false,
            closingTotal: 140,
            homeSpread: 0,
          },
        ],
        teamStats: {
          GONZ: {
            games: 2,
            avgFoulDifferential: 0,
            avgTotalPoints: 140,
            overRate: 0.5,
            winRate: 0.5,
          },
        },
      },
    ],
    teamSplits: {},
  };

  const filtered = filterNcaaRefStats(stats, "cbb");
  assert.equal(filtered.refs.length, 1);
  assert.equal(filtered.refs[0]?.slug, "big-ten-ref");
  assert.equal(gameTouchesLiveNcaaConference("cbb", "MICH", "OSU"), true);
});
