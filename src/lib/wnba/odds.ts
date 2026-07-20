import * as fs from "node:fs";
import * as path from "node:path";
import type { OddsFile } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data", "wnba");

const EMPTY_ODDS: OddsFile = {
  lastUpdated: new Date().toISOString(),
  source: "seeded",
  note: "WNBA odds shard pending Phase 2 ingest.",
  lines: [],
};

export function getOdds(): OddsFile {
  try {
    const raw = fs.readFileSync(path.join(dataDir, "odds.json"), "utf8");
    const parsed = JSON.parse(raw) as OddsFile;
    return parsed.lines?.length ? parsed : EMPTY_ODDS;
  } catch {
    return EMPTY_ODDS;
  }
}
