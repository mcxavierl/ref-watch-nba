import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countRefAnomalyAlerts } from "@/lib/homepage-intelligence";

describe("homepage-intelligence", () => {
  it("counts anomaly alerts across unlocked live leagues", () => {
    const alerts = countRefAnomalyAlerts();
    assert.equal(typeof alerts, "number");
    assert.ok(alerts >= 0);
  });
});
