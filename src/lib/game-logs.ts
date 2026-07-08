import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
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

export const NBA_INGEST_SEASONS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";

const cache = new Map<DataLeague, RuntimeGameLogFile | null>();

const GAME_LOG_GLOBAL_KEYS: Record<DataLeague, keyof typeof globalThis> = {
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
  return (
    (globalThis[GAME_LOG_GLOBAL_KEYS[league]] as RuntimeGameLogFile | undefined) ??
    null
  );
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

function nbaSeasonShardPath(season: string): string {
  return path.join(process.cwd(), "data", "nba", "game-logs", `${season}.ndjson`);
}

function readNbaNdjsonSeason(season: string): RuntimeGameLogEntry[] {
  const filePath = nbaSeasonShardPath(season);
  if (!fs.existsSync(filePath)) return [];
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

function nbaIngestShardsAvailable(): boolean {
  return NBA_INGEST_SEASONS.some((season) =>
    fs.existsSync(nbaSeasonShardPath(season)),
  );
}

function loadNbaGameLogsFromShards(): RuntimeGameLogFile | null {
  if (!nbaIngestShardsAvailable()) return null;

  const games: RuntimeGameLogEntry[] = [];
  for (const season of NBA_INGEST_SEASONS) {
    games.push(...readNbaNdjsonSeason(season));
  }
  if (games.length === 0) return null;

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

function loadNbaGameLogsFromLegacyJson(): RuntimeGameLogFile | null {
  const legacyPath = path.join(process.cwd(), "data", "game-logs.json");
  if (!fs.existsSync(legacyPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(legacyPath, "utf8")) as RuntimeGameLogFile;
  if (!parsed.games?.length) return null;
  return parsed;
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

export function loadRuntimeGameLogs(league: DataLeague): RuntimeGameLogFile | null {
  if (cache.has(league)) return cache.get(league) ?? null;

  const fromGlobal = getCachedGameLogs(league);
  if (fromGlobal) {
    cache.set(league, fromGlobal);
    return fromGlobal;
  }

  try {
    if (league === "NBA") {
      const fromShards = loadNbaGameLogsFromShards();
      if (fromShards) {
        cache.set(league, fromShards);
        return fromShards;
      }
      const fromLegacy = loadNbaGameLogsFromLegacyJson();
      cache.set(league, fromLegacy);
      return fromLegacy;
    }

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

export function nbaManifestChecksum(): string | null {
  const manifestPath = path.join(process.cwd(), "data", "nba", "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, "utf8");
  return createHash("sha256").update(raw).digest("hex");
}
