import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyFoul,
  processFoulData,
  tagNflPenaltyEvent,
} from "./ingest-utils";
import { FoulCategory } from "../../../src/lib/types/foul-categories";
import { buildPenaltyEvent } from "../../../src/lib/impact-calculator";

describe("nfl ingest-utils", () => {
  it("classifies common NFL penalty labels", () => {
    assert.equal(classifyFoul("Delay of Game"), FoulCategory.ADMIN);
    assert.equal(classifyFoul("Defensive Holding"), FoulCategory.SUBJECTIVE);
  });

  it("processFoulData injects optional category without dropping fields", () => {
    const [tagged] = processFoulData([
      { foulName: "False Start", team: "KC", yards: 5 },
    ]);
    assert.equal(tagged.category, FoulCategory.ADMIN);
    assert.equal(tagged.team, "KC");
    assert.equal(tagged.yards, 5);
  });

  it("tagNflPenaltyEvent preserves existing penalty event fields", () => {
    const event = buildPenaltyEvent("Delay of Game", "KC", 5, { down: 1 }, true);
    const tagged = tagNflPenaltyEvent(event);
    assert.equal(tagged.rawType, "Delay of Game");
    assert.equal(tagged.category, FoulCategory.ADMIN);
  });
});
