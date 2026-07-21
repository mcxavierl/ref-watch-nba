import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSlateProjectionCache,
  countSlateGames,
  getCachedProjection,
  writeSlateProjectionCache,
} from "@/lib/cron/slate-projection-cache";
import { getAssignments as getWnbaAssignments } from "@/lib/wnba/data";

describe("slate-projection-cache", () => {
  it("counts assignment games and crew-assigned slates", () => {
    const counts = countSlateGames(["wnba"]);
    assert.ok(counts.gamesUpdated >= 0);
    assert.ok(counts.crewsAssignedCount >= 0);
    assert.ok(counts.crewsAssignedCount <= counts.gamesUpdated);
  });

  it("builds projection cache entries for assigned preview leagues", () => {
    const cache = buildSlateProjectionCache(["wnba"]);
    assert.ok(cache.lastUpdated);
    const entries = Object.values(cache.games);
    if (entries.length > 0) {
      const entry = entries[0];
      assert.equal(entry.leagueId, "wnba");
      assert.ok(entry.preview);
      assert.ok(entry.projectionEvidence);
      assert.ok(typeof entry.projectionEvidence.evidenceStrength === "number");
      assert.ok(typeof entry.projectionEvidence.confidencePct === "number");
      assert.ok(Array.isArray(entry.projectionEvidence.factorsIncreasing));
      assert.ok(Array.isArray(entry.projectionEvidence.factorsReducing));
    }
  });

  it("round-trips through write and read helpers", () => {
    const cache = buildSlateProjectionCache(["wnba"]);
    const filePath = `${process.cwd()}/data/.test-slate-projection-cache.json`;
    writeSlateProjectionCache(cache, filePath);

    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 1);
    assert.ok(game, "expected a WNBA game with crew for cache lookup");

    const cached = getCachedProjection("wnba", game.id, filePath);
    assert.ok(cached);
    assert.equal(cached.gameId, game.id);

    const { unlinkSync } = require("node:fs") as typeof import("node:fs");
    unlinkSync(filePath);
  });
});
