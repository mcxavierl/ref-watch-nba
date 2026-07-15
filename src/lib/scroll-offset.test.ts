import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readScrollOffsetPx } from "@/lib/scroll-offset";

describe("scroll-offset", () => {
  it("falls back when css token is unavailable", () => {
    assert.equal(typeof readScrollOffsetPx(), "number");
    assert.ok(readScrollOffsetPx() >= 48);
  });
});
