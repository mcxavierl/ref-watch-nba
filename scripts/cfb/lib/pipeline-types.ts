import type { CfbConferenceSlug } from "./conferences";

export type CfbPipelineJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type CfbPipelineJob = {
  /** e.g. "2025-sec" */
  id: string;
  season: number;
  conference: CfbConferenceSlug;
  status: CfbPipelineJobStatus;
  /** Index into the ordered game-id list for this job. */
  cursor: number;
  gamesTotal: number;
  gamesProcessed: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  error?: string;
};

export type CfbPipelineConfig = {
  startSeason: number;
  endSeason: number;
  conferences: CfbConferenceSlug[];
};

export type CfbPipelineState = {
  version: 1;
  updatedAt: string;
  config: CfbPipelineConfig;
  jobs: CfbPipelineJob[];
};

export type CfbPipelinePartialProgress = {
  jobId: string;
  season: number;
  conference: CfbConferenceSlug;
  cursor: number;
  processedGameIds: string[];
  savedAt: string;
  reason: "memory" | "timeout" | "chunk";
};

export type CfbMissingDataReport = {
  generatedAt: string;
  checks: {
    jobId: string;
    season: number;
    conference: CfbConferenceSlug;
    expectedCount: number;
    ingestedCount: number;
    missingGameIds: string[];
    extraGameIds: string[];
  }[];
};
