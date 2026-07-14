import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCfbGameSummaryContract } from "./contract";
import { upsertExtractedGame, type CfbExtractedGameRecord } from "./upsert";

function validSummary() {
  return {
    gameId: "401628319",
    date: "2024-09-07",
    season: "2024-25",
    awayAbbr: "WKU",
    homeAbbr: "ALA",
    awayScore: 12,
    homeScore: 63,
    homeFlags: 7,
    awayFlags: 4,
    homePenaltyYards: 59,
    awayPenaltyYards: 40,
    closingTotal: 52,
    homeSpread: -28,
    lineSource: "external" as const,
    officials: [],
    status: "STATUS_FINAL",
  };
}

describe("cfb contract validation", () => {
  it("accepts a complete final game summary", () => {
    const result = validateCfbGameSummaryContract(validSummary());
    assert.equal(result.valid, true);
    assert.equal(result.violations.length, 0);
  });

  it("rejects missing gameId without throwing", () => {
    const summary = { ...validSummary(), gameId: "" };
    const result = validateCfbGameSummaryContract(summary);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.path === "gameId"));
  });
});

describe("cfb extracted game upsert", () => {
  it("upserts by gameId idempotently", () => {
    const file = {
      lastUpdated: "",
      source: "espn" as const,
      gameCount: 0,
      games: {},
    };

    const record: CfbExtractedGameRecord = {
      ...validSummary(),
      extractedAt: new Date().toISOString(),
      contractValid: true,
    };

    assert.equal(upsertExtractedGame(file, record), true);
    assert.equal(upsertExtractedGame(file, { ...record, homeScore: 70 }), false);
    assert.equal(file.games["401628319"].homeScore, 70);
    assert.equal(Object.keys(file.games).length, 1);
  });
});
