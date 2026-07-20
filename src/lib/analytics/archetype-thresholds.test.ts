import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARCHETYPE_LEAGUE_THRESHOLDS,
  archetypeThresholdsForLeague,
} from "@/lib/analytics/archetype-thresholds";
import { classifyAdminRatio } from "@/lib/analytics/referee-archetypes";

describe("archetype-thresholds", () => {
  it("stores distinct ratio bands for NBA, NFL, and WNBA", () => {
    assert.deepEqual(ARCHETYPE_LEAGUE_THRESHOLDS.nba, {
      procedural: 1.5,
      gameManager: 0.7,
    });
    assert.deepEqual(ARCHETYPE_LEAGUE_THRESHOLDS.nfl, {
      procedural: 1.8,
      gameManager: 0.6,
    });
    assert.deepEqual(ARCHETYPE_LEAGUE_THRESHOLDS.wnba, {
      procedural: 1.4,
      gameManager: 0.75,
    });
  });

  it("classifies NFL refs with stricter procedural threshold", () => {
    assert.equal(classifyAdminRatio(1.65, "nba"), "procedural-stickler");
    assert.equal(classifyAdminRatio(1.65, "nfl"), "balanced");
    assert.equal(classifyAdminRatio(1.85, "nfl"), "procedural-stickler");
  });

  it("falls back to NBA defaults for unsupported leagues", () => {
    assert.deepEqual(archetypeThresholdsForLeague("nhl"), ARCHETYPE_LEAGUE_THRESHOLDS.nba);
  });
});
