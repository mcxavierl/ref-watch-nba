import * as path from "node:path";

export const CFB_DATA_DIR = path.join(process.cwd(), "data", "cfb");
export const CFB_RAW_DIR = path.join(CFB_DATA_DIR, "raw");
export const EXTRACTED_GAMES_PATH = path.join(CFB_RAW_DIR, "extracted-games.json");
export const REF_STATS_PATH = path.join(CFB_DATA_DIR, "ref-stats.json");
export const GAME_LOGS_PATH = path.join(CFB_DATA_DIR, "game-logs.json");
export const REF_STATS_CORE_PATH = path.join(CFB_DATA_DIR, "ref-stats-core.json");
export const TEAM_SPLITS_PATH = path.join(CFB_DATA_DIR, "team-splits.json");
export const CFB_INGEST_ERRORS_PATH = path.join(
  process.cwd(),
  "logs",
  "errors",
  "cfb-ingest.json",
);
