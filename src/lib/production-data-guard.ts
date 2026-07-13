import * as fs from "node:fs";
import * as path from "node:path";
import type { TeamCrewSplit } from "@/lib/types";

let nodeDataDirAvailable: boolean | undefined;

function hasLocalDataDir(): boolean {
  if (nodeDataDirAvailable !== undefined) return nodeDataDirAvailable;
  try {
    nodeDataDirAvailable = fs.existsSync(
      path.join(process.cwd(), "data", "baselines.json"),
    );
  } catch {
    nodeDataDirAvailable = false;
  }
  return nodeDataDirAvailable;
}

/**
 * True when Node can read repo `data/` (local dev, CI `next build`).
 * False on Cloudflare Workers where multi-MB sync parses risk 1100/1102.
 */
export function allowNodeDataFs(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return hasLocalDataDir();
}

/** Avoid sync-parsing multi-MB team-splits.json on Workers when CDN cache missed. */
export function diskTeamSplitsFallback(
  loadFromDisk: () => Record<string, TeamCrewSplit[]>,
): Record<string, TeamCrewSplit[]> {
  if (!allowNodeDataFs()) return {};
  return loadFromDisk();
}
