import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRefSparkline,
  computeTeamInsightHub,
  HIGH_CORRELATION_DELTA_PTS,
  HIGH_CORRELATION_WIN_DELTA,
} from "@/lib/team-insight-hub";
import { TEAM_REF_MIN_GAMES } from "@/lib/teamRefLeaderboards";
import type { RefProfile, RefGameRecord } from "@/lib/types";

function makeRef(
  slug: string,
  name: string,
  recentGames: RefGameRecord[] = [],
  teamStats?: RefProfile["teamStats"],
): RefProfile {
  return {
    slug,
    name,
    number: 1,
    games: 50,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2023-24"],
    recentGames,
    teamStats,
  };
}

describe("buildRefSparkline", () => {
  it("builds cumulative edge oldest to newest for team games", () => {
    const ref = makeRef("scott-foster", "Scott Foster", [
      {
        gameId: "1",
        date: "2024-01-01",
        season: "2023-24",
        homeTeam: "LAL",
        awayTeam: "BOS",
        totalPoints: 220,
        totalFouls: 40,
        overHit: true,
        raptorsInvolved: false,
        homeScore: 110,
        awayScore: 100,
      } as RefGameRecord & { homeScore: number; awayScore: number },
      {
        gameId: "2",
        date: "2024-01-02",
        season: "2023-24",
        homeTeam: "BOS",
        awayTeam: "LAL",
        totalPoints: 210,
        totalFouls: 38,
        overHit: false,
        raptorsInvolved: false,
        homeScore: 105,
        awayScore: 110,
      } as RefGameRecord & { homeScore: number; awayScore: number },
    ]);

    const values = buildRefSparkline(ref, "LAL", 10);
    assert.deepEqual(values, [1, 2]);
  });

  it("uses whistle proxy when scores are unavailable", () => {
    const ref = makeRef("proxy-ref", "Proxy Ref", [
      {
        gameId: "1",
        date: "2024-01-01",
        season: "2023-24",
        homeTeam: "LAL",
        awayTeam: "BOS",
        totalPoints: 220,
        totalFouls: 40,
        overHit: true,
        raptorsInvolved: false,
        homeMinors: 2,
        awayMinors: 5,
      },
    ]);

    const values = buildRefSparkline(ref, "LAL", 10);
    assert.equal(values.length, 1);
    assert.equal(values[0], 1);
  });
});

describe("computeTeamInsightHub", () => {
  it("groups refs by correlation threshold", () => {
    const hub = computeTeamInsightHub({
      league: "nba",
      teamAbbr: "LAL",
      teamLabel: "the Lakers",
      teamName: "Lakers",
      teamRecord: { wins: 25, losses: 25, games: 50, winRate: 0.5 },
      refSplits: [
        {
          slug: "hot-ref",
          name: "Hot Ref",
          games: TEAM_REF_MIN_GAMES,
          avgFoulDifferential: 1,
          avgTotalPoints: 220,
          overRate: 0.5,
          winRate: 0.7,
        },
        {
          slug: "flat-ref",
          name: "Flat Ref",
          games: TEAM_REF_MIN_GAMES,
          avgFoulDifferential: 0,
          avgTotalPoints: 220,
          overRate: 0.5,
          winRate: 0.52,
        },
      ],
      refs: [
        makeRef("hot-ref", "Hot Ref"),
        makeRef("flat-ref", "Flat Ref"),
      ],
      crewSplits: [],
      leagueAvgTotal: 220,
      leagueOverBaseline: 220.5,
      leagueAvgFouls: 40,
    });

    assert.ok(
      hub.performanceMatrix.highCorrelation.some((row) => row.slug === "hot-ref"),
    );
    assert.ok(
      hub.performanceMatrix.neutralCorrelation.some(
        (row) => row.slug === "flat-ref",
      ),
    );
    assert.ok(
      Math.abs(0.7 - 0.5) >= HIGH_CORRELATION_WIN_DELTA ||
        Math.abs(20) >= HIGH_CORRELATION_DELTA_PTS,
    );
  });

  it("computes reliability from qualified ref splits", () => {
    const hub = computeTeamInsightHub({
      league: "nba",
      teamAbbr: "LAL",
      teamLabel: "the Lakers",
      teamName: "Lakers",
      teamRecord: { wins: 10, losses: 10, games: 20, winRate: 0.5 },
      refSplits: [
        {
          slug: "qualified",
          name: "Qualified",
          games: TEAM_REF_MIN_GAMES,
          avgFoulDifferential: 0,
          avgTotalPoints: 220,
          overRate: 0.5,
          winRate: 0.5,
        },
        {
          slug: "thin",
          name: "Thin",
          games: 3,
          avgFoulDifferential: 0,
          avgTotalPoints: 220,
          overRate: 0.5,
          winRate: 0.5,
        },
      ],
      refs: [makeRef("qualified", "Qualified"), makeRef("thin", "Thin")],
      crewSplits: [],
      leagueAvgTotal: 220,
      leagueOverBaseline: 220.5,
      leagueAvgFouls: 40,
    });

    assert.equal(hub.edgeSummary.reliabilityScore, 50);
  });
});
