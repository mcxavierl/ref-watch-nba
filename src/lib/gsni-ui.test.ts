import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGsniDelta,
  gsniDeltaArrow,
  gsniDeltaFromNeutral,
  gsniDeltaTone,
} from "@/lib/gsni-ui";

describe("gsni-ui", () => {
  it("computes delta tone and arrows from neutral baseline", () => {
    assert.equal(gsniDeltaFromNeutral(62), 12);
    assert.equal(gsniDeltaTone(12), "positive");
    assert.equal(gsniDeltaArrow(12), "▲");
    assert.equal(formatGsniDelta(12), "+12");
    assert.equal(gsniDeltaTone(-8), "negative");
    assert.equal(gsniDeltaArrow(-8), "▼");
    assert.equal(formatGsniDelta(-8), "-8");
  });
});
