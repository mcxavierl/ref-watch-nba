import * as fs from "node:fs";
import * as path from "node:path";
import type { RefOfficial } from "@/lib/types";

export type GameLineSource = "external" | "synthetic";

export interface RuntimeGameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeMinors?: number;
  awayMinors?: number;
  wentToOvertime?: boolean;
  closingTotal: number;
  homeSpread: number;
  lineSource: GameLineSource;
  officials: RefOfficial[];
}

export interface RuntimeGameLogFile {
  lastUpdated: string;
  league: "NBA" | "NHL";
  source: string;
  games: RuntimeGameLogEntry[];
}

const cache = new Map<"NBA" | "NHL", RuntimeGameLogFile | null>();

function gameLogPath(league: "NBA" | "NHL"): string {
  const root = path.join(process.cwd(), "data");
  return league === "NBA"
    ? path.join(root, "game-logs.json")
    : path.join(root, "nhl", "game-logs.json");
}

export function loadRuntimeGameLogs(
  league: "NBA" | "NHL",
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

export function gameLogsAvailable(league: "NBA" | "NHL"): boolean {
  const file = loadRuntimeGameLogs(league);
  return (file?.games.length ?? 0) > 0;
}
