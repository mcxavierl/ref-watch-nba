import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WHISTLE_DRIFT_EXTREME_PCT,
  WHISTLE_DRIFT_MIN_GAMES,
  computeRefWhistleFatigue,
} from "@/lib/whistle-fatigue";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefProfile } from "@/lib/types";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";

const PROFILE: RefProfile = {
  slug: "test-ref-42",
  name: "Test Ref",
  number: 42,
  games: 40,
  avgTotalPoints: 220,
  overRate: 0.5,
  avgFouls: 40,
  homeCoverRate: null,
  totalPointsDelta: 0,
  foulsDelta: 0,
  seasons: ["2024-25"],
  recentGames: [],
};

function nbaGame(id: string, q1: number, q2: number, q3: number, q4: number) {
  return {
    gameId: id,
    date: "2024-10-22",
    season: "2024-25",
    league: "NBA" as const,
    homeTeam: "BOS",
    awayTeam: "NYK",
    homeScore: 110,
    awayScore: 105,
    totalPoints: 215,
    totalFouls: q1 + q2 + q3 + q4,
    closingTotal: 220,
    homeSpread: -3,
    lineSource: "external" as const,
    officials: [{ name: "Test Ref", number: 42, role: "referee" as const }],
    whistlePeriodSplits: {
      unit: "quarter" as const,
      source: "boxscore" as const,
      buckets: [
        { period: 1, home: Math.round(q1 / 2), away: q1 - Math.round(q1 / 2) },
        { period: 2, home: Math.round(q2 / 2), away: q2 - Math.round(q2 / 2) },
        { period: 3, home: Math.round(q3 / 2), away: q3 - Math.round(q3 / 2) },
        { period: 4, home: Math.round(q4 / 2), away: q4 - Math.round(q4 / 2) },
      ],
    },
  } satisfies RuntimeGameLogEntry;
}

describe("computeRefWhistleFatigue", () => {
  it("flags whistle fatigue when late-period fouls drop", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games = Array.from({ length: WHISTLE_DRIFT_MIN_GAMES }, (_, i) =>
      nbaGame(`g-${i}`, 12, 11, 8, 6),
    );

    const result = computeRefWhistleFatigue("nba", PROFILE, games);
    assert.ok(result);
    assert.equal(result.pattern, "fatigue");
    assert.ok(result.lateVsEarlyPct < -WHISTLE_DRIFT_EXTREME_PCT);
    assert.match(result.driftHeadline, /lower fouls threshold/i);
  });

  it("flags escalation when late-period fouls rise", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games = Array.from({ length: WHISTLE_DRIFT_MIN_GAMES }, (_, i) =>
      nbaGame(`g-${i}`, 6, 7, 11, 14),
    );

    const result = computeRefWhistleFatigue("nba", PROFILE, games);
    assert.ok(result);
    assert.equal(result.pattern, "escalation");
    assert.ok(result.lateVsEarlyPct > 0);
  });

  it("returns null without enough split games", () => {
    getWorkerIsolateStore().matrixCompute.clear();
    const games = Array.from({ length: 4 }, (_, i) =>
      nbaGame(`g-${i}`, 10, 10, 10, 10),
    );
    assert.equal(computeRefWhistleFatigue("nba", PROFILE, games), null);
  });
});
