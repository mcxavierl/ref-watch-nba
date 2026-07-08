import * as fs from "node:fs";
import * as path from "node:path";
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
  "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
  RuntimeGameLogFile | null
>();

function gameLogPath(league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB"): string {
  const root = path.join(process.cwd(), "data");
  if (league === "NBA") return path.join(root, "game-logs.json");
  if (league === "NHL") return path.join(root, "nhl", "game-logs.json");
  if (league === "NFL") return path.join(root, "nfl", "game-logs.json");
  if (league === "EPL") return path.join(root, "epl", "game-logs.json");
  if (league === "CBB") return path.join(root, "cbb", "game-logs.json");
  return path.join(root, "cfb", "game-logs.json");
}

export function loadRuntimeGameLogs(
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
): RuntimeGameLogFile | null {
  if (cache.has(league)) return cache.get(league) ?? null;

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
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
): boolean {
  const file = loadRuntimeGameLogs(league);
  return Boolean(file?.games?.length);
}
