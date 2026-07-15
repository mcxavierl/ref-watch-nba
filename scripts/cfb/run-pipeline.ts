#!/usr/bin/env npx tsx
/**
 * Resumable CFB generational pipeline: season x conference jobs with chunking,
 * memory flush, and Cloudflare-style runtime early exit.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_CONFERENCE_SLUGS } from "./lib/conferences";
import {
  countJobsByStatus,
  createInitialState,
  DEFAULT_MEMORY_THRESHOLD_BYTES,
  DEFAULT_PIPELINE_SEASONS,
  findNextJob,
  isMemoryPressure,
  isRuntimeExceeded,
  loadPipelineState,
  resolveMaxRuntimeMs,
  savePipelineState,
  transitionJobStatus,
  updateJobProgress,
} from "./lib/batch-processor";
import {
  loadGameLogs,
  runIntegrityCheckForJob,
  writeMissingDataReport,
} from "./lib/integrity-check";
import {
  clearPartialProgress,
  collectScheduleForJob,
  loadExistingGameLogs,
  loadExtractedGamesForConference,
  loadOfficialRoster,
  loadPartialProgress,
  loadSeedStats,
  mergeExtractedGames,
  mergeGameLogs,
  processGameChunk,
  savePartialProgress,
  writeConferenceStaging,
  writeGameLogsFile,
  writeRefStatsOutputs,
} from "./lib/pipeline-ingest";
import type { CfbPipelineConfig, CfbPipelineState } from "./lib/pipeline-types";

const DATA_DIR = path.join(process.cwd(), "data", "cfb");
const STAGING_DIR = path.join(DATA_DIR, "staging");
const STATE_PATH = path.join(DATA_DIR, "pipeline-state.json");
const MISSING_DATA_PATH = path.join(process.cwd(), "logs", "errors", "missing-data.json");

type PipelineArgs = {
  testSeason?: number;
  chunkSize: number;
  maxRuntimeMs?: number;
  memoryThresholdBytes: number;
  initOnly: boolean;
  integrityOnly: boolean;
  reset: boolean;
};

function parseArgs(): PipelineArgs {
  const argv = process.argv.slice(2);
  let testSeason: number | undefined;
  let chunkSize = 50;
  let maxRuntimeMs: number | undefined;
  let memoryThresholdBytes = DEFAULT_MEMORY_THRESHOLD_BYTES;
  let initOnly = false;
  let integrityOnly = false;
  let reset = false;

  for (const arg of argv) {
    if (arg.startsWith("--season=")) {
      testSeason = Number.parseInt(arg.slice("--season=".length), 10);
      if (!Number.isFinite(testSeason)) {
        throw new Error(`Invalid --season value: ${arg}`);
      }
    } else if (arg.startsWith("--chunk-size=")) {
      chunkSize = Number.parseInt(arg.slice("--chunk-size=".length), 10);
      if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
        throw new Error(`Invalid --chunk-size value: ${arg}`);
      }
    } else if (arg.startsWith("--max-runtime-ms=")) {
      maxRuntimeMs = Number.parseInt(arg.slice("--max-runtime-ms=".length), 10);
      if (!Number.isFinite(maxRuntimeMs) || maxRuntimeMs <= 0) {
        throw new Error(`Invalid --max-runtime-ms value: ${arg}`);
      }
    } else if (arg.startsWith("--memory-threshold-mb=")) {
      const mb = Number.parseInt(arg.slice("--memory-threshold-mb=".length), 10);
      if (!Number.isFinite(mb) || mb <= 0) {
        throw new Error(`Invalid --memory-threshold-mb value: ${arg}`);
      }
      memoryThresholdBytes = mb * 1024 * 1024;
    } else if (arg === "--init-only") {
      initOnly = true;
    } else if (arg === "--integrity-only") {
      integrityOnly = true;
    } else if (arg === "--reset") {
      reset = true;
    }
  }

  maxRuntimeMs = resolveMaxRuntimeMs(maxRuntimeMs, process.env.CFB_PIPELINE_MAX_RUNTIME_MS);

  return {
    testSeason,
    chunkSize,
    maxRuntimeMs,
    memoryThresholdBytes,
    initOnly,
    integrityOnly,
    reset,
  };
}

function resolveConfig(testSeason?: number): CfbPipelineConfig {
  if (testSeason != null) {
    return {
      startSeason: testSeason,
      endSeason: testSeason,
      conferences: [...CFB_CONFERENCE_SLUGS],
    };
  }
  return {
    startSeason: DEFAULT_PIPELINE_SEASONS.start,
    endSeason: DEFAULT_PIPELINE_SEASONS.end,
    conferences: [...CFB_CONFERENCE_SLUGS],
  };
}

function ensurePipelineState(config: CfbPipelineConfig, reset: boolean): CfbPipelineState {
  if (reset || !fs.existsSync(STATE_PATH)) {
    const state = createInitialState(config);
    savePipelineState(STATE_PATH, state);
    return state;
  }

  const existing = loadPipelineState(STATE_PATH);
  if (!existing) {
    const state = createInitialState(config);
    savePipelineState(STATE_PATH, state);
    return state;
  }

  const sameConfig =
    existing.config.startSeason === config.startSeason &&
    existing.config.endSeason === config.endSeason &&
    existing.config.conferences.join(",") === config.conferences.join(",");

  if (!sameConfig || existing.jobs.length === 0) {
    if (!sameConfig) {
      console.log("Pipeline config changed - reinitializing state.");
    } else {
      console.log("Pipeline state has no jobs - initializing.");
    }
    const state = createInitialState(config);
    savePipelineState(STATE_PATH, state);
    return state;
  }

  return existing;
}

async function runIntegrityForCompletedJobs(state: CfbPipelineState): Promise<void> {
  const gameLogs = loadGameLogs(path.join(DATA_DIR, "game-logs.json"));
  const completed = state.jobs.filter((job) => job.status === "completed");
  if (completed.length === 0) {
    console.log("No completed jobs to validate.");
    return;
  }

  console.log(`Running integrity checks for ${completed.length} completed job(s)...`);
  const checks = [];
  for (const job of completed) {
    const check = await runIntegrityCheckForJob({ job, gameLogs });
    checks.push(check);
    if (check.missingGameIds.length > 0) {
      console.warn(
        `  ${job.id}: missing ${check.missingGameIds.length} of ${check.expectedCount} expected games`,
      );
    } else {
      console.log(`  ${job.id}: OK (${check.ingestedCount}/${check.expectedCount})`);
    }
  }

  const report = writeMissingDataReport(MISSING_DATA_PATH, checks);
  const totalMissing = checks.reduce((sum, row) => sum + row.missingGameIds.length, 0);
  console.log(
    `Integrity report written to ${MISSING_DATA_PATH} (${totalMissing} missing game ids)`,
  );
  if (totalMissing > 0) {
    console.warn("Missing game ids logged for follow-up ingest.");
  }
  void report;
}

async function processOneJob(
  state: CfbPipelineState,
  args: PipelineArgs,
): Promise<{ state: CfbPipelineState; exitEarly: boolean }> {
  const job = findNextJob(state);
  if (!job) {
    return { state, exitEarly: false };
  }

  const runStartedMs = Date.now();
  let nextState =
    job.status === "pending"
      ? transitionJobStatus(state, job.id, "processing")
      : state;

  console.log(
    `\nJob ${job.id}: cursor=${job.cursor}, processed=${job.gamesProcessed}/${job.gamesTotal || "?"}`,
  );

  const schedule = await collectScheduleForJob(job.season, job.conference);

  const gamesTotal = schedule.size;
  nextState = updateJobProgress(nextState, job.id, {
    cursor: job.cursor,
    gamesProcessed: job.gamesProcessed,
    gamesTotal,
  });

  const partial = loadPartialProgress(STAGING_DIR, job.id);
  const skipGameIds = new Set(partial?.processedGameIds ?? []);

  const seed = loadSeedStats(DATA_DIR);
  const roster = loadOfficialRoster(seed);

  const chunk = await processGameChunk({
    season: job.season,
    conference: job.conference,
    schedule,
    cursor: job.cursor,
    chunkSize: args.chunkSize,
    roster,
    skipGameIds,
  });

  const processedIds = [
    ...(partial?.processedGameIds ?? []),
    ...chunk.gameLogs.map((game) => game.gameId),
  ];

  const existingLogs = loadExistingGameLogs(DATA_DIR);
  const mergedLogs = mergeGameLogs(existingLogs, chunk.gameLogs);
  writeGameLogsFile(DATA_DIR, mergedLogs);

  const existingExtracted = loadExtractedGamesForConference(STAGING_DIR, job.conference);
  const mergedExtracted = mergeExtractedGames(existingExtracted, chunk.extractedGames);
  writeConferenceStaging(STAGING_DIR, job.conference, mergedExtracted, mergedLogs.length);

  if (chunk.gameLogs.length > 0) {
    writeRefStatsOutputs(DATA_DIR, mergedLogs, roster);
  }

  const gamesProcessed = processedIds.length;
  const nextCursor = chunk.nextCursor;

  if (isMemoryPressure(args.memoryThresholdBytes)) {
    console.warn(
      `Memory threshold reached (${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB). ` +
        "Flushing partial progress and pausing.",
    );
    savePartialProgress(STAGING_DIR, {
      jobId: job.id,
      season: job.season,
      conference: job.conference,
      cursor: nextCursor,
      processedGameIds: processedIds,
      savedAt: new Date().toISOString(),
      reason: "memory",
    });
    nextState = updateJobProgress(nextState, job.id, {
      cursor: nextCursor,
      gamesProcessed,
      gamesTotal,
    });
    savePipelineState(STATE_PATH, nextState);
    return { state: nextState, exitEarly: true };
  }

  if (isRuntimeExceeded(runStartedMs, args.maxRuntimeMs)) {
    console.warn("Max runtime reached. Saving partial staging and exiting for resume.");
    savePartialProgress(STAGING_DIR, {
      jobId: job.id,
      season: job.season,
      conference: job.conference,
      cursor: nextCursor,
      processedGameIds: processedIds,
      savedAt: new Date().toISOString(),
      reason: "timeout",
    });
    nextState = updateJobProgress(nextState, job.id, {
      cursor: nextCursor,
      gamesProcessed,
      gamesTotal,
    });
    savePipelineState(STATE_PATH, nextState);
    return { state: nextState, exitEarly: true };
  }

  if (!chunk.done) {
    savePartialProgress(STAGING_DIR, {
      jobId: job.id,
      season: job.season,
      conference: job.conference,
      cursor: nextCursor,
      processedGameIds: processedIds,
      savedAt: new Date().toISOString(),
      reason: "chunk",
    });
    nextState = updateJobProgress(nextState, job.id, {
      cursor: nextCursor,
      gamesProcessed,
      gamesTotal,
    });
    savePipelineState(STATE_PATH, nextState);
    console.log(
      `Chunk complete: +${chunk.processedThisRun} games (${gamesProcessed}/${gamesTotal}). Re-run to continue.`,
    );
    return { state: nextState, exitEarly: true };
  }

  clearPartialProgress(STAGING_DIR, job.id);
  nextState = transitionJobStatus(
    updateJobProgress(nextState, job.id, {
      cursor: nextCursor,
      gamesProcessed,
      gamesTotal,
    }),
    job.id,
    "completed",
  );
  savePipelineState(STATE_PATH, nextState);
  console.log(`Job ${job.id} completed (${gamesProcessed} games, ${chunk.fetchErrors} fetch errors).`);
  return { state: nextState, exitEarly: false };
}

async function main() {
  const args = parseArgs();
  const config = resolveConfig(args.testSeason);

  console.log("=== Ref Watch CFB Generational Pipeline ===");
  console.log(
    `Seasons: ${config.startSeason}-${config.endSeason}, chunk=${args.chunkSize}` +
      (args.maxRuntimeMs ? `, maxRuntime=${args.maxRuntimeMs}ms` : ""),
  );

  let state = ensurePipelineState(config, args.reset);

  if (args.initOnly) {
    const counts = countJobsByStatus(state);
    console.log(`Initialized ${state.jobs.length} jobs at ${STATE_PATH}`);
    console.log(`  pending=${counts.pending}, completed=${counts.completed}`);
    return;
  }

  if (args.integrityOnly) {
    await runIntegrityForCompletedJobs(state);
    return;
  }

  let result: { state: CfbPipelineState; exitEarly: boolean };
  try {
    result = await processOneJob(state, args);
  } catch (err) {
    const job = findNextJob(state);
    if (job) {
      state = transitionJobStatus(state, job.id, "failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      savePipelineState(STATE_PATH, state);
    }
    throw err;
  }
  state = result.state;

  const counts = countJobsByStatus(state);
  console.log(
    `\nPipeline status: pending=${counts.pending}, processing=${counts.processing}, ` +
      `completed=${counts.completed}, failed=${counts.failed}`,
  );

  if (!result.exitEarly && counts.pending === 0 && counts.processing === 0) {
    await runIntegrityForCompletedJobs(state);
    console.log("\nAll jobs complete.");
  } else if (result.exitEarly) {
    console.log("\nPaused for resume. Re-run the same command to continue.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
