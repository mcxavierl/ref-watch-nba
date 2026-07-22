import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeSlateWindowBounds,
  isWithinActiveSlateWindow,
  isWithinRecentTrendsWindow,
  RECENT_TRENDS_LOOKBACK_MS,
} from "@/lib/query-windows";

describe("query-windows", () => {
  const now = Date.parse("2026-07-22T18:00:00.000Z");

  it("defines active slate as now - 6h through now + 30h", () => {
    const { windowStartMs, windowEndMs } = activeSlateWindowBounds(now);
    assert.equal(windowEndMs - windowStartMs, 36 * 60 * 60 * 1000);
    assert.equal(isWithinActiveSlateWindow(now + 2 * 60 * 60 * 1000, now), true);
    assert.equal(isWithinActiveSlateWindow(now + 31 * 60 * 60 * 1000, now), false);
  });

  it("defines recent trends as the last 30 days", () => {
    const recent = now - 10 * 24 * 60 * 60 * 1000;
    const old = now - RECENT_TRENDS_LOOKBACK_MS - 60_000;
    assert.equal(isWithinRecentTrendsWindow(recent, now), true);
    assert.equal(isWithinRecentTrendsWindow(old, now), false);
  });
});
