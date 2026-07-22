import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recalibrateProfiles } from "@/lib/cron/recalibrateProfiles";
import { createAutopsyRecord } from "@/lib/services/autopsyRecordStore";
import { ASSIGNED_WNBA_GAME_FIXTURE } from "@/lib/wnba/test-fixtures";

describe("recalibrateProfiles", () => {
  it("recalibrates metrics for officials attached to an autopsy record", async () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;

    const officialSlugs = game.crew.map((official) => {
      const base = official.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return `${base}-${official.number}`;
    });

    const autopsy = createAutopsyRecord({
      gameId: game.id,
      leagueId: "wnba",
      officialSlugs,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      season: "2025-26",
      actualFouls: 42,
      expectedFouls: 38,
      delta: 4,
      rarityPercentile: 82,
      attributionCrewPct: 45,
      attributionStylePct: 35,
      attributionGamestatePct: 20,
      summaryText: "Test autopsy summary.",
    });

    const result = await recalibrateProfiles({ autopsy });
    assert.ok(result.latencyMs >= 0);
    assert.ok(result.officialsUpdated.length >= 0);
  });
});
