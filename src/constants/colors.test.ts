import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  consistencyStateClass,
  deltaStateClass,
  STATE_COLOR_CLASS,
  STATE_COLORS,
} from "@/constants/colors";

describe("constants/colors", () => {
  it("exposes terminal state color tokens", () => {
    assert.equal(STATE_COLORS.RISK, "var(--state-risk)");
    assert.equal(STATE_COLORS.VOLATILE_RED, "var(--state-volatile)");
    assert.equal(STATE_COLORS.STABLE_GREEN, "var(--state-stable)");
    assert.equal(STATE_COLORS.NEUTRAL_BLUE, "var(--state-neutral)");
  });

  it("maps volatility scores to stable state classes", () => {
    assert.equal(consistencyStateClass(3), STATE_COLOR_CLASS.volatile);
    assert.equal(consistencyStateClass(8), STATE_COLOR_CLASS.stable);
    assert.equal(consistencyStateClass(6), STATE_COLOR_CLASS.neutral);
  });

  it("maps signed deltas to risk/stable classes", () => {
    assert.equal(deltaStateClass(1.2), STATE_COLOR_CLASS.stable);
    assert.equal(deltaStateClass(-0.5), STATE_COLOR_CLASS.risk);
    assert.equal(deltaStateClass(0), STATE_COLOR_CLASS.neutral);
  });
});
