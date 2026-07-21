import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runSlatePoll } from "@/lib/cron/slatePoller";

describe("slatePoller", () => {
  it("skips ingest outside the assignment window unless forced", async () => {
    const result = await runSlatePoll({
      now: new Date("2026-07-21T20:00:00.000Z"),
      force: false,
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.withinWindow, false);
    assert.equal(result.gamesUpdated, 0);
    assert.equal(result.crewsAssignedCount, 0);
    assert.equal(result.projectionsWritten, 0);
    assert.ok(result.logId);
    assert.equal(result.stepsCompleted.length, 0);
  });
});
