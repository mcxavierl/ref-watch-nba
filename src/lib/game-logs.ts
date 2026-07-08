import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
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

export const NBA_INGEST_SEASONS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

const cache = new Map<
  "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
  RuntimeGameLogFile | null
>();

function nbaSeasonShardPath(season: string): string {
  return path.join(process.cwd(), "data", "nba", "game-logs", `${season}.ndjson`);
}

function readNbaNdjsonSeason(season: string): RuntimeGameLogEntry[] {
  const filePath = nbaSeasonShardPath(season);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing NBA game log shard: ${filePath}. Run scripts/ingest/ingest-full.ts.`,
    );
  }
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const games: RuntimeGameLogEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      games.push(JSON.parse(line) as RuntimeGameLogEntry);
    } catch (err) {
      throw new Error(`Corrupt NBA NDJSON in ${filePath}: ${err}`);
    }
  }
  return games;
}

function loadNbaGameLogs(): RuntimeGameLogFile {
  const games: RuntimeGameLogEntry[] = [];
  for (const season of NBA_INGEST_SEASONS) {
    games.push(...readNbaNdjsonSeason(season));
  }
  games.sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );

  let source = "Basketball-Reference + NBA Stats API";
  try {
    const manifestPath = path.join(process.cwd(), "data", "nba", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        data_source?: string;
      };
      if (manifest.data_source) source = manifest.data_source;
    }
  } catch {
    /* manifest optional at read time; shards are authoritative */
  }

  return {
    lastUpdated: new Date().toISOString(),
    league: "NBA",
    source,
    games,
  };
}

function gameLogPath(league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB"): string {
  const root = path.join(process.cwd(), "data");
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
    if (league === "NBA") {
      const parsed = loadNbaGameLogs();
      cache.set(league, parsed);
      return parsed;
    }

    const raw = fs.readFileSync(gameLogPath(league), "utf8");
    const parsed = JSON.parse(raw) as RuntimeGameLogFile;
    cache.set(league, parsed);
    return parsed;
  } catch (err) {
    if (league === "NBA") throw err;
    cache.set(league, null);
    return null;
  }
}

export function gameLogsAvailable(
  league: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
): boolean {
  try {
    const file = loadRuntimeGameLogs(league);
    return Boolean(file?.games?.length);
  } catch {
    return false;
  }
}

export function nbaManifestChecksum(): string | null {
  const manifestPath = path.join(process.cwd(), "data", "nba", "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, "utf8");
  return createHash("sha256").update(raw).digest("hex");
}
