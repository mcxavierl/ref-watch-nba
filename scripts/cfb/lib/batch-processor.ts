import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_CONFERENCE_SLUGS, type CfbConferenceSlug } from "./conferences";
import type {
  CfbPipelineConfig,
  CfbPipelineJob,
  CfbPipelineJobStatus,
  CfbPipelineState,
} from "./pipeline-types";

export const DEFAULT_PIPELINE_SEASONS = { start: 2016, end: 2026 } as const;

/** Default heapUsed threshold: 1.5 GB. */
export const DEFAULT_MEMORY_THRESHOLD_BYTES = Math.floor(1.5 * 1024 * 1024 * 1024);

export function buildJobId(season: number, conference: CfbConferenceSlug): string {
  return `${season}-${conference}`;
}

export function parseJobId(id: string): { season: number; conference: CfbConferenceSlug } {
  const dash = id.lastIndexOf("-");
  if (dash <= 0) {
    throw new Error(`Invalid job id: ${id}`);
  }
  const season = Number.parseInt(id.slice(0, dash), 10);
  const conference = id.slice(dash + 1) as CfbConferenceSlug;
  if (!Number.isFinite(season) || !CFB_CONFERENCE_SLUGS.includes(conference)) {
    throw new Error(`Invalid job id: ${id}`);
  }
  return { season, conference };
}

export function splitSeasonRange(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error(`Invalid season range: ${start}-${end}`);
  }
  const seasons: number[] = [];
  for (let year = start; year <= end; year++) {
    seasons.push(year);
  }
  return seasons;
}

export function generateJobs(
  seasons: number[],
  conferences: readonly CfbConferenceSlug[] = CFB_CONFERENCE_SLUGS,
): CfbPipelineJob[] {
  const jobs: CfbPipelineJob[] = [];
  for (const season of seasons) {
    for (const conference of conferences) {
      jobs.push({
        id: buildJobId(season, conference),
        season,
        conference,
        status: "pending",
        cursor: 0,
        gamesTotal: 0,
        gamesProcessed: 0,
      });
    }
  }
  return jobs;
}

export function createInitialState(config: CfbPipelineConfig): CfbPipelineState {
  const seasons = splitSeasonRange(config.startSeason, config.endSeason);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    config,
    jobs: generateJobs(seasons, config.conferences),
  };
}

export function loadPipelineState(filePath: string): CfbPipelineState | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as CfbPipelineState;
  if (raw.version !== 1 || !Array.isArray(raw.jobs)) {
    throw new Error(`Unsupported pipeline state at ${filePath}`);
  }
  return raw;
}

export function savePipelineState(filePath: string, state: CfbPipelineState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const next: CfbPipelineState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`);
}

export function findNextJob(state: CfbPipelineState): CfbPipelineJob | null {
  const processing = state.jobs.find((job) => job.status === "processing");
  if (processing) return processing;
  return state.jobs.find((job) => job.status === "pending") ?? null;
}

export function getJob(state: CfbPipelineState, jobId: string): CfbPipelineJob | undefined {
  return state.jobs.find((job) => job.id === jobId);
}

export function transitionJobStatus(
  state: CfbPipelineState,
  jobId: string,
  status: CfbPipelineJobStatus,
  patch: Partial<CfbPipelineJob> = {},
): CfbPipelineState {
  const now = new Date().toISOString();
  const jobs = state.jobs.map((job) => {
    if (job.id !== jobId) return job;
    const next: CfbPipelineJob = {
      ...job,
      ...patch,
      status,
      updatedAt: now,
    };
    if (status === "processing" && !next.startedAt) {
      next.startedAt = now;
    }
    if (status === "completed" || status === "failed") {
      next.completedAt = now;
    }
    return next;
  });
  return { ...state, jobs, updatedAt: now };
}

export function updateJobProgress(
  state: CfbPipelineState,
  jobId: string,
  progress: Pick<CfbPipelineJob, "cursor" | "gamesProcessed" | "gamesTotal">,
): CfbPipelineState {
  const now = new Date().toISOString();
  const jobs = state.jobs.map((job) =>
    job.id === jobId
      ? {
          ...job,
          ...progress,
          updatedAt: now,
        }
      : job,
  );
  return { ...state, jobs, updatedAt: now };
}

export function filterStateToSeason(
  state: CfbPipelineState,
  season: number,
): CfbPipelineState {
  return {
    ...state,
    jobs: state.jobs.filter((job) => job.season === season),
  };
}

export function countJobsByStatus(state: CfbPipelineState): Record<CfbPipelineJobStatus, number> {
  const counts: Record<CfbPipelineJobStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const job of state.jobs) {
    counts[job.status] += 1;
  }
  return counts;
}

export function isMemoryPressure(thresholdBytes = DEFAULT_MEMORY_THRESHOLD_BYTES): boolean {
  const { heapUsed } = process.memoryUsage();
  return heapUsed >= thresholdBytes;
}

export function isRuntimeExceeded(
  startedAtMs: number,
  maxRuntimeMs: number | undefined,
): boolean {
  if (!maxRuntimeMs || maxRuntimeMs <= 0) return false;
  return Date.now() - startedAtMs >= maxRuntimeMs;
}

export function resolveMaxRuntimeMs(
  cliValue: number | undefined,
  envValue: string | undefined,
): number | undefined {
  if (cliValue != null && Number.isFinite(cliValue) && cliValue > 0) {
    return cliValue;
  }
  if (!envValue) return undefined;
  const parsed = Number.parseInt(envValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
