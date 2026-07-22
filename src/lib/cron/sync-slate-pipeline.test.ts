import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRunFilesystemAssignmentSync } from "@/lib/cron/sync-slate-pipeline";

describe("sync-slate-pipeline", () => {
  it("detects local data directory for assignment sync", () => {
    assert.equal(typeof canRunFilesystemAssignmentSync(), "boolean");
    assert.equal(canRunFilesystemAssignmentSync(), true);
  });
});
