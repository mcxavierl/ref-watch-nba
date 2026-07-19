import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAT_CARD_ANCHOR,
  statCardHashId,
} from "@/lib/stat-card-id";

describe("statCardHashId", () => {
  it("slugifies human titles", () => {
    assert.equal(statCardHashId("Whistle Frequency"), "whistle-frequency");
    assert.equal(statCardHashId("  Home team ATS  "), "home-team-ats");
  });

  it("preserves stable insight kind ids", () => {
    assert.equal(statCardHashId("top-over"), "top-over");
    assert.equal(statCardHashId("scoring-delta"), "scoring-delta");
  });
});

describe("STAT_CARD_ANCHOR", () => {
  it("uses semantic keys for hub and profile cards", () => {
    assert.equal(STAT_CARD_ANCHOR.hubInsight("top-over"), "top-over");
    assert.equal(STAT_CARD_ANCHOR.profileSignal("scoring-delta"), "scoring-delta");
    assert.equal(STAT_CARD_ANCHOR.metricLabel("Avg combined score"), "avg-combined-score");
  });
});
