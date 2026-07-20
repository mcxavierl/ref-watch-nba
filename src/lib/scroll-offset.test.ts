import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStatCardElement,
  readScrollOffsetPx,
  statCardHashFocusMs,
} from "@/lib/scroll-offset";

describe("scroll-offset", () => {
  it("falls back when css token is unavailable", () => {
    assert.equal(typeof readScrollOffsetPx(), "number");
    assert.ok(readScrollOffsetPx() >= 48);
  });

  it("exports stat card hash focus duration", () => {
    assert.equal(statCardHashFocusMs, 1500);
  });

  it("detects stat card elements by data attribute", () => {
    const el = { dataset: { statCard: "true" }, classList: { contains: () => false } };
    assert.equal(isStatCardElement(el as unknown as HTMLElement), true);
  });
});
