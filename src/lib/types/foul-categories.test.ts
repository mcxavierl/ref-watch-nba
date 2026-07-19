import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyFoulName,
  FoulCategory,
  FOUL_CLASSIFICATION_MAP,
  getFoulCategory,
} from "@/lib/types/foul-categories";

describe("foul-categories taxonomy", () => {
  it("maps common NBA and NFL foul names to ADMIN or SUBJECTIVE", () => {
    assert.equal(
      FOUL_CLASSIFICATION_MAP.nba["Delay of Game"],
      FoulCategory.ADMIN,
    );
    assert.equal(
      FOUL_CLASSIFICATION_MAP.nba["Shooting Foul"],
      FoulCategory.SUBJECTIVE,
    );
    assert.equal(
      FOUL_CLASSIFICATION_MAP.nfl["Delay of Game"],
      FoulCategory.ADMIN,
    );
    assert.equal(
      FOUL_CLASSIFICATION_MAP.nfl["Defensive Holding"],
      FoulCategory.SUBJECTIVE,
    );
  });

  it("classifies slug aliases from ingest feeds", () => {
    assert.equal(classifyFoulName("nba", "delay_of_game"), FoulCategory.ADMIN);
    assert.equal(classifyFoulName("nba", "shooting_foul"), FoulCategory.SUBJECTIVE);
    assert.equal(classifyFoulName("nfl", "false_start"), FoulCategory.ADMIN);
    assert.equal(
      classifyFoulName("nfl", "defensive_holding"),
      FoulCategory.SUBJECTIVE,
    );
  });

  it("returns undefined for unknown mapped names via strict lookup", () => {
    assert.equal(getFoulCategory("nba", "Unknown Foul"), undefined);
    assert.equal(classifyFoulName("nba", "Unknown Foul"), FoulCategory.SUBJECTIVE);
  });
});
