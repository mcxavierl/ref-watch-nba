import "@/lib/global-stats";
import type { RefOfficial } from "@/lib/types";
import { isGameLogsPayload } from "@/lib/json-asset-guards";

export type GameLineSource = "external" | "synthetic";

export interface RuntimeGameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
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
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  source: string;
  games: RuntimeGameLogEntry[];
}

export type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

const GAME_LOG_GLOBAL_KEYS: Record<DataLeague, keyof typeof globalThis> = {
  NBA: "__REFWATCH_NBA_GAME_LOGS__",
  NHL: "__REFWATCH_NHL_GAME_LOGS__",
  NFL: "__REFWATCH_NFL_GAME_LOGS__",
  EPL: "__REFWATCH_EPL_GAME_LOGS__",
  LALIGA: "__REFWATCH_LALIGA_GAME_LOGS__",
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
};

const GAME_LOG_ASSET_BASE: Record<DataLeague, string> = {
  NBA: "/data/nba",
  NHL: "/data/nhl",
  NFL: "/data/nfl",
  EPL: "/data/epl",
  LALIGA: "/data/laliga",
  CBB: "/data/cbb",
  CFB: "/data/cfb",
};

export function getCachedGameLogs(league: DataLeague): RuntimeGameLogFile | null {
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

/** Edge-safe: fetch game logs from static assets (no Node fs). */
export async function preloadNbaGameLogSeasons(
  origin: string,
  seasons: string[],
): Promise<void> {
  if (!origin?.trim() || seasons.length === 0) return;

  const seasonSet = new Set(seasons);
  const cached = getCachedGameLogs("NBA");
  if (cached) {
    const scoped = cached.games.filter((game) => seasonSet.has(game.season));
    if (scoped.length > 0) {
      setCachedGameLogs("NBA", { ...cached, games: scoped });
    }
    return;
  }

  const games: RuntimeGameLogEntry[] = [];
  for (const season of [...seasons].sort()) {
    try {
      const res = await fetch(`${origin}/data/nba/game-logs/${season}.ndjson`);
      if (!res.ok) continue;
      const text = await res.text();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        games.push(JSON.parse(trimmed) as RuntimeGameLogEntry);
      }
    } catch {
      continue;
    }
  }

  if (games.length === 0) {
    await preloadGameLogsFromAssets(origin, "NBA");
    const full = getCachedGameLogs("NBA");
    if (full) {
      const scoped = full.games.filter((game) => seasonSet.has(game.season));
      if (scoped.length > 0) {
        setCachedGameLogs("NBA", { ...full, games: scoped });
      }
    }
    return;
  }

  games.sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
  setCachedGameLogs("NBA", {
    lastUpdated: new Date().toISOString(),
    league: "NBA",
    source: "Basketball-Reference + NBA Stats API",
    games,
  });
}

/** Edge-safe: fetch game logs from static assets (no Node fs). */
export async function preloadGameLogsFromAssets(
  origin: string,
  league: DataLeague,
): Promise<void> {
  if (getCachedGameLogs(league)) return;
  if (!origin?.trim()) return;

  try {
    const res = await fetch(`${origin}${GAME_LOG_ASSET_BASE[league]}/game-logs.json`);
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (isGameLogsPayload(data) && data.games.length > 0) {
      setCachedGameLogs(league, data as RuntimeGameLogFile);
    }
  } catch {
    // Never fail SSR from game-log preload.
  }
}
