import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildJobId,
  countJobsByStatus,
  createInitialState,
  findNextJob,
  generateJobs,
  isMemoryPressure,
  isRuntimeExceeded,
  parseJobId,
  savePipelineState,
  splitSeasonRange,
  transitionJobStatus,
  updateJobProgress,
} from "./batch-processor";
import { CFB_CONFERENCE_SLUGS, isCfbPipelineConferenceGame } from "./conferences";
import type { CfbPipelineState } from "./pipeline-types";

describe("CFB batch processor", () => {
  it("builds season x conference job ids", () => {
    assert.equal(buildJobId(2025, "sec"), "2025-sec");
    assert.deepEqual(parseJobId("2025-sec"), { season: 2025, conference: "sec" });
  });

  it("splits a multi-year season range", () => {
    assert.deepEqual(splitSeasonRange(2016, 2018), [2016, 2017, 2018]);
  });

  it("generates one job per season and conference", () => {
    const jobs = generateJobs([2025], CFB_CONFERENCE_SLUGS);
    assert.equal(jobs.length, CFB_CONFERENCE_SLUGS.length);
    assert.ok(jobs.every((job) => job.status === "pending"));
    assert.equal(jobs[0]?.cursor, 0);
  });

  it("transitions job status with timestamps", () => {
    let state = createInitialState({
      startSeason: 2025,
      endSeason: 2025,
      conferences: ["sec"],
    });
    const jobId = "2025-sec";

    state = transitionJobStatus(state, jobId, "processing");
    const processing = findNextJob(state);
    assert.ok(processing);
    assert.equal(processing.status, "processing");
    assert.ok(processing.startedAt);

    state = updateJobProgress(state, jobId, {
      cursor: 10,
      gamesProcessed: 10,
      gamesTotal: 120,
    });
    const updated = state.jobs.find((job) => job.id === jobId);
    assert.equal(updated?.cursor, 10);
    assert.equal(updated?.gamesTotal, 120);

    state = transitionJobStatus(state, jobId, "completed");
    const completed = state.jobs.find((job) => job.id === jobId);
    assert.equal(completed?.status, "completed");
    assert.ok(completed?.completedAt);
  });

  it("resumes processing jobs before pending jobs", () => {
    const state: CfbPipelineState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      config: { startSeason: 2025, endSeason: 2025, conferences: ["sec", "acc"] },
      jobs: [
        {
          id: "2025-sec",
          season: 2025,
          conference: "sec",
          status: "processing",
          cursor: 5,
          gamesProcessed: 5,
          gamesTotal: 100,
        },
        {
          id: "2025-acc",
          season: 2025,
          conference: "acc",
          status: "pending",
          cursor: 0,
          gamesProcessed: 0,
          gamesTotal: 0,
        },
      ],
    };

    assert.equal(findNextJob(state)?.id, "2025-sec");
  });

  it("counts jobs by status", () => {
    const state = createInitialState({
      startSeason: 2025,
      endSeason: 2025,
      conferences: ["sec", "acc"],
    });
    const counts = countJobsByStatus(state);
    assert.equal(counts.pending, 2);
    assert.equal(counts.completed, 0);
  });

  it("detects runtime exceeded", () => {
    const start = Date.now() - 5000;
    assert.equal(isRuntimeExceeded(start, 10000), false);
    assert.equal(isRuntimeExceeded(start, 1000), true);
    assert.equal(isRuntimeExceeded(start, undefined), false);
  });

  it("reports memory pressure against threshold", () => {
    const heapUsed = process.memoryUsage().heapUsed;
    assert.equal(isMemoryPressure(heapUsed - 1), true);
    assert.equal(isMemoryPressure(heapUsed + 1024 * 1024 * 1024), false);
  });

  it("persists state to disk", () => {
    const filePath = "/tmp/cfb-pipeline-state-test.json";
    const state = createInitialState({
      startSeason: 2025,
      endSeason: 2025,
      conferences: ["sec"],
    });
    savePipelineState(filePath, state);
    assert.ok(state.jobs.length === 1);
  });

  it("allows Big 12 pipeline games outside the live NCAA UI gate", () => {
    assert.equal(isCfbPipelineConferenceGame("BYU", "UTAH", "big-12"), true);
    assert.equal(isCfbPipelineConferenceGame("ALA", "UGA", "big-12"), false);
  });
});
