import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEdgeNote } from "@/lib/analytics/build-edge-note";

describe("build-edge-note", () => {
  it("flags volatile refs for O/U caution", () => {
    const note = buildEdgeNote({
      consistencyScore: 3,
      leverageProfile: "neutral",
      leverageIndex: 0.05,
      archetype: "balanced",
    });
    assert.match(note, /Volatile ref/);
    assert.match(note, /Over\/Under/);
  });

  it("surfaces leverage sensitivity for high-pressure refs", () => {
    const note = buildEdgeNote({
      consistencyScore: 6,
      leverageProfile: "high-leverage-sensitivity",
      leverageIndex: 0.28,
      archetype: "procedural-stickler",
    });
    assert.match(note, /leverage sensitivity/i);
  });
});
