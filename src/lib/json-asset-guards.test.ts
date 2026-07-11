import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isGameLogsPayload,
  isRefStatsPayload,
  isTeamSplitsPayload,
  normalizeAppPathname,
} from "@/lib/json-asset-guards";

test("normalizeAppPathname handles empty and malformed values", () => {
  assert.equal(normalizeAppPathname(null), "/");
  assert.equal(normalizeAppPathname(undefined), "/");
  assert.equal(normalizeAppPathname(""), "/");
  assert.equal(normalizeAppPathname("nfl"), "/nfl");
  assert.equal(normalizeAppPathname("/nfl?scope=all"), "/nfl");
  assert.equal(normalizeAppPathname("  /nhl/insights  "), "/nhl/insights");
});

test("isRefStatsPayload rejects invalid shapes", () => {
  assert.equal(isRefStatsPayload(null), false);
  assert.equal(isRefStatsPayload({ meta: {}, refs: "bad" }), false);
  assert.equal(
    isRefStatsPayload({ meta: { lastUpdated: "x" }, refs: [] }),
    true,
  );
});

test("isTeamSplitsPayload rejects non-array team rows", () => {
  assert.equal(isTeamSplitsPayload(null), false);
  assert.equal(isTeamSplitsPayload({ KC: "bad" }), false);
  assert.equal(isTeamSplitsPayload({ KC: [] }), true);
});

test("isGameLogsPayload requires games array", () => {
  assert.equal(isGameLogsPayload({}), false);
  assert.equal(isGameLogsPayload({ games: [] }), true);
});
