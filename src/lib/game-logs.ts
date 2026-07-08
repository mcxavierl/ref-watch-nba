import * as fs from "node:fs";
import * as path from "node:path";
import {
  getCachedGameLogs,
  type DataLeague,
  type GameLineSource,
  type RuntimeGameLogEntry,
  type RuntimeGameLogFile,
} from "@/lib/game-logs-preload";

export type { GameLineSource, RuntimeGameLogEntry, RuntimeGameLogFile, DataLeague };
export { getCachedGameLogs, setCachedGameLogs, preloadGameLogsFromAssets } from "@/lib/game-logs-preload";

const cache = new Map<DataLeague, RuntimeGameLogFile | null>();

function gameLogPath(league: DataLeague): string {
  const root = path.join(process.cwd(), "data");
  if (league === "NBA") return path.join(root, "game-logs.json");
  if (league === "NHL") return path.join(root, "nhl", "game-logs.json");
  if (league === "NFL") return path.join(root, "nfl", "game-logs.json");
  if (league === "EPL") return path.join(root, "epl", "game-logs.json");
  if (league === "CBB") return path.join(root, "cbb", "game-logs.json");
  return path.join(root, "cfb", "game-logs.json");
}

export function loadRuntimeGameLogs(league: DataLeague): RuntimeGameLogFile | null {
  if (cache.has(league)) return cache.get(league) ?? null;

  const fromGlobal = getCachedGameLogs(league);
  if (fromGlobal) {
    cache.set(league, fromGlobal);
    return fromGlobal;
  }

  try {
    const raw = fs.readFileSync(gameLogPath(league), "utf8");
    const parsed = JSON.parse(raw) as RuntimeGameLogFile;
    cache.set(league, parsed);
    return parsed;
  } catch {
    cache.set(league, null);
    return null;
  }
}

export function gameLogsAvailable(league: DataLeague): boolean {
  const file = loadRuntimeGameLogs(league);
  return Boolean(file?.games?.length);
}
