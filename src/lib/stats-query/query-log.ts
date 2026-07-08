import * as fs from "node:fs";
import * as path from "node:path";
import type { StatsQuery, StatsSampleFlag } from "@/lib/stats-query/schema";

export interface StatsQueryLogEntry {
  timestamp: string;
  raw_nl: string;
  parsed_query: StatsQuery;
  n: number;
  sample_flag: StatsSampleFlag;
}

const LOG_PATH = path.join(process.cwd(), "data", "stats-query-log.jsonl");

const memoryLog: StatsQueryLogEntry[] = [];

export function appendStatsQueryLog(entry: Omit<StatsQueryLogEntry, "timestamp">): StatsQueryLogEntry {
  const row: StatsQueryLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  memoryLog.push(row);
  if (memoryLog.length > 500) memoryLog.shift();

  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    // Workers runtime may not have writable FS; memory buffer still holds recent rows.
  }

  return row;
}

export function readStatsQueryLog(limit = 100): StatsQueryLogEntry[] {
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as StatsQueryLogEntry);
  } catch {
    return memoryLog.slice(-limit);
  }
}
