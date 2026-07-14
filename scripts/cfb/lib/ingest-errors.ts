import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_INGEST_ERRORS_PATH } from "./paths";

export interface CfbIngestErrorEntry {
  at: string;
  phase: "extract" | "transform" | "contract";
  gameId?: string;
  message: string;
  details?: unknown;
}

export interface CfbIngestErrorLog {
  lastUpdated: string;
  entries: CfbIngestErrorEntry[];
}

function readLog(): CfbIngestErrorLog {
  if (!fs.existsSync(CFB_INGEST_ERRORS_PATH)) {
    return { lastUpdated: new Date().toISOString(), entries: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(CFB_INGEST_ERRORS_PATH, "utf8")) as CfbIngestErrorLog;
  } catch {
    return { lastUpdated: new Date().toISOString(), entries: [] };
  }
}

export function appendCfbIngestError(
  entry: Omit<CfbIngestErrorEntry, "at">,
): void {
  const log = readLog();
  log.entries.push({ ...entry, at: new Date().toISOString() });
  log.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(CFB_INGEST_ERRORS_PATH), { recursive: true });
  fs.writeFileSync(CFB_INGEST_ERRORS_PATH, `${JSON.stringify(log, null, 2)}\n`);
}

export function clearCfbIngestErrors(): void {
  if (fs.existsSync(CFB_INGEST_ERRORS_PATH)) {
    fs.unlinkSync(CFB_INGEST_ERRORS_PATH);
  }
}
