import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../../src/lib/types";
import { splitRefStatsForDeploy } from "../../lib/split-ref-stats";
import { buildSecVerifiedSample } from "../build-sec-verified-sample";
import {
  CFB_DATA_DIR,
  GAME_LOGS_PATH,
  REF_STATS_CORE_PATH,
  REF_STATS_PATH,
  TEAM_SPLITS_PATH,
} from "./paths";
import type { CfbGameLogEntry } from "./transform";

export interface CfbBuildStateFile {
  lastUpdated: string;
  mode: "preview" | "full";
  currentSeason: string;
  currentSeasonGameCount: number;
  minGameLogThreshold: number;
  gameLogsPublished: boolean;
  note: string;
}

export const CFB_BUILD_STATE_PATH = path.join(CFB_DATA_DIR, "build-state.json");

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeCfbBuildState(state: CfbBuildStateFile): void {
  writeJson(CFB_BUILD_STATE_PATH, state);
}

function writePreviewGameLogs(): void {
  writeJson(GAME_LOGS_PATH, {
    lastUpdated: new Date().toISOString(),
    league: "CFB",
    source: "preview",
    games: [],
  });
}

function writeFullGameLogs(gameLogs: CfbGameLogEntry[]): void {
  writeJson(GAME_LOGS_PATH, {
    lastUpdated: new Date().toISOString(),
    league: "CFB",
    source: "espn",
    games: gameLogs,
  });
}

function writeRefOutputs(stats: RefStatsFile): void {
  writeJson(REF_STATS_PATH, stats);
  const split = splitRefStatsForDeploy(stats);
  writeJson(REF_STATS_CORE_PATH, split.core);
  writeJson(TEAM_SPLITS_PATH, split.teamSplits);
}

export interface CfbPreviewWriteInput {
  currentSeason: string;
  currentSeasonCount: number;
  threshold: number;
}

/** Preview mode: fallback ref-stats, no granular game logs. */
export function writeCfbPreviewOutputs(input: CfbPreviewWriteInput): void {
  const fallback = buildSecVerifiedSample();
  const stats: RefStatsFile = {
    ...fallback,
    meta: {
      ...fallback.meta,
      note:
        `Preview mode: ${input.currentSeasonCount}/${input.threshold} ` +
        `${input.currentSeason} games ingested. SEC verified sample shown until ` +
        `the current-season game-log threshold is met.`,
      ncaa_pipeline_verified: false,
      ncaa_pipeline_coverage_pct: Math.min(
        100,
        Math.round((input.currentSeasonCount / input.threshold) * 100),
      ),
    },
  };

  writeRefOutputs(stats);
  writePreviewGameLogs();
  writeCfbBuildState({
    lastUpdated: new Date().toISOString(),
    mode: "preview",
    currentSeason: input.currentSeason,
    currentSeasonGameCount: input.currentSeasonCount,
    minGameLogThreshold: input.threshold,
    gameLogsPublished: false,
    note: stats.meta.note ?? "",
  });
}

export interface CfbFullWriteInput extends CfbPreviewWriteInput {
  gameLogs: CfbGameLogEntry[];
  stats: RefStatsFile | null;
  seed: RefStatsFile;
}

/** Full mode: publish granular game logs and ESPN-derived stats when available. */
export function writeCfbFullOutputs(input: CfbFullWriteInput): void {
  writeFullGameLogs(input.gameLogs);
  const stats = input.stats ?? input.seed;
  if (stats.refs.length > 0) {
    writeRefOutputs(stats);
  }

  writeCfbBuildState({
    lastUpdated: new Date().toISOString(),
    mode: "full",
    currentSeason: input.currentSeason,
    currentSeasonGameCount: input.currentSeasonCount,
    minGameLogThreshold: input.threshold,
    gameLogsPublished: true,
    note:
      `Full game logs published for ${input.currentSeason} ` +
      `(${input.currentSeasonCount} games, threshold ${input.threshold}).`,
  });
}
