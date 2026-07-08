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

export type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";

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
