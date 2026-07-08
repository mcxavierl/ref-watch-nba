import * as fs from "node:fs";
import * as path from "node:path";
import "@/lib/global-stats";
import type { RefOfficial } from "@/lib/types";

export type GameLineSource = "external" | "synthetic";

export interface RuntimeGameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeMinors?: number;
  awayMinors?: number;
  wentToOvertime?: boolean;
  homeFlags?: number;
  awayFlags?: number;
  homePenaltyYards?: number;
  awayPenaltyYards?: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: GameLineSource;
  officials: RefOfficial[];
}

export interface RuntimeGameLogFile {
  lastUpdated: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  source: string;
  games: RuntimeGameLogEntry[];
}

const cache = new Map<
  DataLeague,
  RuntimeGameLogFile | null
>();

type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";

const GAME_LOG_GLOBAL_KEYS: Record<
  DataLeague,
  keyof typeof globalThis
> = {
  NBA: "__REFWATCH_NBA_GAME_LOGS__",
  NHL: "__REFWATCH_NHL_GAME_LOGS__",
  NFL: "__REFWATCH_NFL_GAME_LOGS__",
  EPL: "__REFWATCH_EPL_GAME_LOGS__",
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
};

const GAME_LOG_ASSET_BASE: Record<DataLeague, string> = {
  NBA: "/data/nba",
  NHL: "/data/nhl",
  NFL: "/data/nfl",
  EPL: "/data/epl",
  CBB: "/data/cbb",
  CFB: "/data/cfb",
};

function getCachedGameLogs(league: DataLeague): RuntimeGameLogFile | null {
  return (globalThis[GAME_LOG_GLOBAL_KEYS[league]] as RuntimeGameLogFile | undefined) ?? null;
}

export function setCachedGameLogs(
  league: DataLeague,
  data: RuntimeGameLogFile,
): void {
  (globalThis as Record<string, unknown>)[GAME_LOG_GLOBAL_KEYS[league]] = data;
}

export async function preloadGameLogsFromAssets(
  origin: string,
  league: DataLeague,
): Promise<void> {
  if (getCachedGameLogs(league)) return;

  const res = await fetch(`${origin}${GAME_LOG_ASSET_BASE[league]}/game-logs.json`);
  if (!res.ok) return;
  const data = (await res.json()) as RuntimeGameLogFile;
  if (data.games?.length) {
    setCachedGameLogs(league, data);
  }
}

function gameLogPath(league: DataLeague): string {
  const root = path.join(process.cwd(), "data");
  if (league === "NBA") return path.join(root, "game-logs.json");
  if (league === "NHL") return path.join(root, "nhl", "game-logs.json");
  if (league === "NFL") return path.join(root, "nfl", "game-logs.json");
  if (league === "EPL") return path.join(root, "epl", "game-logs.json");
  if (league === "CBB") return path.join(root, "cbb", "game-logs.json");
  return path.join(root, "cfb", "game-logs.json");
}

export function loadRuntimeGameLogs(
  league: DataLeague,
): RuntimeGameLogFile | null {
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

export function gameLogsAvailable(
  league: DataLeague,
): boolean {
  const file = loadRuntimeGameLogs(league);
  return Boolean(file?.games?.length);
}
