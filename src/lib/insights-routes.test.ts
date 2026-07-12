import assert from "node:assert/strict";
import { test } from "node:test";
import {
  insightsViewFromHash,
  insightsViewFromPathname,
  insightsViewHref,
} from "@/lib/insights-routes";

test("insightsViewHref maps tabs to canonical routes", () => {
  assert.equal(insightsViewHref("nba", "trends"), "/trends");
  assert.equal(insightsViewHref("nba", "tendencies"), "/rankings");
  assert.equal(insightsViewHref("nba", "findings"), "/research");
  assert.equal(insightsViewHref("nfl", "trends"), "/nfl/trends");
  assert.equal(insightsViewHref("nfl", "tendencies"), "/nfl/rankings");
  assert.equal(insightsViewHref("nfl", "findings"), "/nfl/research");
});

test("insightsViewFromPathname resolves active tab from URL", () => {
  assert.equal(insightsViewFromPathname("/nfl/trends"), "trends");
  assert.equal(insightsViewFromPathname("/trends"), "trends");
  assert.equal(insightsViewFromPathname("/nfl/rankings"), "tendencies");
  assert.equal(insightsViewFromPathname("/nfl/research"), "findings");
  assert.equal(insightsViewFromPathname("/nfl/insights"), null);
});

test("insightsViewFromHash supports legacy rankings alias", () => {
  assert.equal(insightsViewFromHash("rankings"), "tendencies");
  assert.equal(insightsViewFromHash("trends"), "trends");
});
