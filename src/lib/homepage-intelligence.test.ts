import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import {
  countRefAnomalyAlerts,
  countTodayAnomalyAlerts,
} from "@/lib/homepage-intelligence";

describe("homepage-intelligence", () => {
  it("counts slate-scoped anomaly alerts with a realistic upper bound", () => {
    const data = loadOverviewSnapshot();
    const alerts = countTodayAnomalyAlerts(data);
    assert.equal(typeof alerts, "number");
    assert.ok(alerts >= 0);
    assert.ok(alerts <= 40, `expected slate-scoped alerts, got ${alerts}`);
  });

  it("keeps deprecated global counter wired to slate scope", () => {
    const data = loadOverviewSnapshot();
    assert.equal(countRefAnomalyAlerts(), countTodayAnomalyAlerts(data));
  });
});
