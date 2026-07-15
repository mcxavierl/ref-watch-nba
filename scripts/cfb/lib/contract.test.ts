import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMissingOfficials,
  validateExtractedGame,
  validateExtractedGames,
} from "./contract";
import type { CfbExtractedGame } from "./types";

const VALID_GAME: CfbExtractedGame = {
  gameId: "401628901",
  date: "2024-10-12",
  season: "2024-25",
  homeTeam: "ALA",
  awayTeam: "UGA",
  conference: "SEC",
  totalPoints: 52,
  totalFouls: 10,
  officials: [{ name: "Carl Cheffers", number: 51 }],
};

describe("CFB extracted-game contract", () => {
  it("accepts a well-formed extracted game", () => {
    assert.equal(validateExtractedGame(VALID_GAME).length, 0);
  });

  it("rejects missing identifiers and invalid dates", () => {
    const issues = validateExtractedGame({
      ...VALID_GAME,
      gameId: "",
      date: "10/12/2024",
      homeTeam: "",
    });
    assert.ok(issues.some((issue) => issue.field === "gameId"));
    assert.ok(issues.some((issue) => issue.field === "date"));
    assert.ok(issues.some((issue) => issue.field === "homeTeam"));
  });

  it("rejects unknown teams and empty official names", () => {
    const issues = validateExtractedGame({
      ...VALID_GAME,
      awayTeam: "ZZZ",
      officials: [{ name: "" }],
    });
    assert.ok(issues.some((issue) => issue.field === "team"));
    assert.ok(issues.some((issue) => issue.field.includes("officials")));
  });

  it("summarizes batch validation counts", () => {
    const result = validateExtractedGames([
      VALID_GAME,
      { ...VALID_GAME, gameId: "bad", date: "invalid" },
    ]);
    assert.equal(result.passed, 1);
    assert.equal(result.failed, 1);
  });

  it("counts games without officials", () => {
    assert.equal(countMissingOfficials([VALID_GAME, { ...VALID_GAME, gameId: "2", officials: [] }]), 1);
  });
});
