import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statCardHashId } from "@/lib/stat-card-id";

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
