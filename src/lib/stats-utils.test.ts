import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBaselinePct, formatBaselineAtsPct } from "@/lib/stats-utils";

describe("formatBaselinePct", () => {
  it('returns "n/a" when baseline games are zero', () => {
    assert.equal(formatBaselinePct(0, 0), "n/a");
    assert.equal(formatBaselinePct(0, 0.5), "n/a");
  });

  it("formats win rate when baseline games exist", () => {
    assert.equal(formatBaselinePct(10, 0.5), "50.0%");
    assert.equal(formatBaselinePct(1, 0), "0.0%");
  });

  it("formats ATS cover rate when lined games exist", () => {
    assert.equal(formatBaselineAtsPct(0, 0.5), "n/a");
    assert.equal(formatBaselineAtsPct(12, 0.583), "58.3%");
  });
});
