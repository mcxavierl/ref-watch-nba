import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyFoul,
  processFoulData,
  processNbaFoulShardEntry,
} from "./ingest-utils";
import { FoulCategory } from "../../../src/lib/types/foul-categories";

describe("nba ingest-utils", () => {
  it("classifies common NBA foul labels", () => {
    assert.equal(classifyFoul("Delay of Game"), FoulCategory.ADMIN);
    assert.equal(classifyFoul("Shooting Foul"), FoulCategory.SUBJECTIVE);
  });

  it("processFoulData leaves unknown fouls additive-compatible", () => {
    const [tagged] = processFoulData([{ foulName: "Custom Event" }]);
    assert.equal(tagged.category, FoulCategory.SUBJECTIVE);
  });

  it("processNbaFoulShardEntry tags nested fouls before shard write", () => {
    const entry = processNbaFoulShardEntry({
      gameId: "0022500001",
      season: "2025-26",
      fouls: [
        { foulName: "Delay of Game" },
        { foulName: "Shooting Foul" },
      ],
    });

    assert.equal(entry.fouls?.[0]?.category, FoulCategory.ADMIN);
    assert.equal(entry.fouls?.[1]?.category, FoulCategory.SUBJECTIVE);
  });
});
