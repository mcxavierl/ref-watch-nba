import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleAutopsyRecordInserted,
  registerAutopsyRecalibrationSubscriber,
} from "@/lib/cron/autopsy-recalibrate-subscriber";
import { createAutopsyRecord } from "@/lib/services/autopsyRecordStore";

describe("autopsy-recalibrate-subscriber", () => {
  it("registers without throwing", async () => {
    await registerAutopsyRecalibrationSubscriber();
    await registerAutopsyRecalibrationSubscriber();
    assert.ok(true);
  });

  it("handles completed autopsy inserts", async () => {
    const record = createAutopsyRecord({
      gameId: "test-game",
      leagueId: "wnba",
      officialSlugs: [],
      homeTeam: "TOR",
      awayTeam: "BOS",
      season: "2025-26",
      actualFouls: 40,
      expectedFouls: 36,
      delta: 4,
      rarityPercentile: 70,
      attributionCrewPct: 40,
      attributionStylePct: 40,
      attributionGamestatePct: 20,
      summaryText: "Completed autopsy.",
      status: "COMPLETED",
    });

    await handleAutopsyRecordInserted(record);
    assert.equal(record.status, "COMPLETED");
  });
});
