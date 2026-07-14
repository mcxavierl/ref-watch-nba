import * as fs from "node:fs";
import * as path from "node:path";
import { allowNodeDataFs } from "@/lib/production-data-guard";

export interface CfbBuildState {
  lastUpdated: string;
  mode: "preview" | "full";
  currentSeason: string;
  currentSeasonGameCount: number;
  minGameLogThreshold: number;
  gameLogsPublished: boolean;
  note: string;
}

const BUILD_STATE_PATH = path.join(process.cwd(), "data", "cfb", "build-state.json");

let cached: CfbBuildState | null | undefined;

function readBuildState(): CfbBuildState | null {
  if (cached !== undefined) return cached;
  if (!allowNodeDataFs()) {
    cached = null;
    return null;
  }
  try {
    cached = JSON.parse(fs.readFileSync(BUILD_STATE_PATH, "utf8")) as CfbBuildState;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function getCfbBuildState(): CfbBuildState | null {
  return readBuildState();
}

export function isCfbGameLogsPreview(): boolean {
  const state = readBuildState();
  return state?.mode === "preview" || state?.gameLogsPublished === false;
}

export function cfbGameLogPreviewMessage(): string | null {
  const state = readBuildState();
  if (!state || state.mode !== "preview") return null;
  return (
    state.note ||
    `Preview mode: ${state.currentSeasonGameCount}/${state.minGameLogThreshold} ` +
      `${state.currentSeason} games ingested. Full game logs unlock at the threshold.`
  );
}
