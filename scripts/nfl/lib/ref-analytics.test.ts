import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RefGameRecord } from "../../../src/lib/types";
import {
  buildNflRefAnalyticsForOfficial,
  nflAnalyticsGameSample,
} from "./ref-analytics";

function flagGame(id: string): RefGameRecord {
  return {
    gameId: id,
    date: "2024-09-01",
    season: "2024-25",
    homeTeam: "KC",
    awayTeam: "BAL",
    totalPoints: 47,
    totalFouls: 12,
    homeFlags: 7,
    awayFlags: 6,
    homePenaltyYards: 55,
    awayPenaltyYards: 40,
    totalPenaltyYards: 95,
    overHit: true,
    raptorsInvolved: false,
    closingTotal: 45,
    homeSpread: -3,
  };
}

describe("NFL ref analytics", () => {
  it("uses referee-only games when available", () => {
    const refOnly = Array.from({ length: 12 }, (_, i) => flagGame(`ref-${i}`));
    const all = [...refOnly, ...Array.from({ length: 5 }, (_, i) => flagGame(`all-${i}`))];
    assert.equal(nflAnalyticsGameSample(refOnly, all).length, 12);
  });

  it("falls back to all crew games when no referee sample exists", () => {
    const all = Array.from({ length: 12 }, (_, i) => flagGame(`crew-${i}`));
    assert.equal(nflAnalyticsGameSample([], all).length, 12);
  });

  it("builds analytics for umpire whose last role was not referee", () => {
    const refereeSample = Array.from({ length: 12 }, (_, i) => flagGame(`r-${i}`));
    const crewSample = Array.from({ length: 20 }, (_, i) => flagGame(`c-${i}`));
    const analytics = buildNflRefAnalyticsForOfficial(refereeSample, crewSample);
    assert.ok(analytics);
    assert.ok(analytics.penaltyYardsDelta !== undefined);
    assert.ok(analytics.balanceKind);
  });
});
