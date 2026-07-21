import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import type { LeagueId } from "@/lib/leagues";

export type SlateIngestionStatus = "success" | "partial" | "skipped" | "error";

export type SlatePollIngestStep = {
  label: string;
  command: string;
  leagueId?: LeagueId;
  optional?: boolean;
};

export type SlatePollOptions = {
  /** Override poll start time (tests only). */
  now?: Date;
  /** Run even outside the 8 AM - 12 PM ET assignment window. */
  force?: boolean;
  /** Rebuild overview snapshot and insights after ingest. */
  rebuildOverview?: boolean;
  /** Run integrity monitor pipeline after ingest. */
  runIntegrity?: boolean;
  /** Write NBA slate alerts artifact. */
  writeAlerts?: boolean;
  /** League ingest commands to run (defaults to all live leagues). */
  steps?: SlatePollIngestStep[];
};

export type SlateProjectionCacheEntry = {
  gameId: string;
  leagueId: LeagueId;
  matchup: string;
  crewCount: number;
  updatedAt: string;
  preview: GameSlatePreviewPayload;
  projectionEvidence: ProjectionEvidencePayload;
};

export type SlateProjectionCacheFile = {
  lastUpdated: string;
  games: Record<string, SlateProjectionCacheEntry>;
};

export type SlatePollResult = {
  status: SlateIngestionStatus;
  startedAt: string;
  finishedAt: string;
  latencyMs: number;
  withinWindow: boolean;
  gamesUpdated: number;
  crewsAssignedCount: number;
  projectionsWritten: number;
  stepsCompleted: string[];
  stepsFailed: string[];
  cachePath: string;
  logId: string;
};

export type SlateIngestionLogRecord = {
  id: string;
  timestamp: string;
  gamesUpdated: number;
  crewsAssignedCount: number;
  latencyMs: number;
  status: SlateIngestionStatus;
  projectionsWritten: number;
  stepsCompleted: string[];
  stepsFailed: string[];
};
