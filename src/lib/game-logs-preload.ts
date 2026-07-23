import { fetchStaticJson, safeOriginFetch } from "@/lib/edge-fetch";
import {
  freezeWorkerConfig,
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";
import "@/lib/global-stats";
import type { RefOfficial } from "@/lib/types";
import type { WhistlePeriodSplits } from "@/lib/whistle-period-splits";
import type { GamePersonnelSnapshot } from "@/lib/personnel-types";
import { isGameLogsPayload } from "@/lib/json-asset-guards";

export type GameLineSource = "external" | "synthetic";

export interface RuntimeGameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls?: number;
  awayFouls?: number;
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
  /** Quarter/half/period foul or penalty distributions when ingested. */
  whistlePeriodSplits?: WhistlePeriodSplits;
  /** Coaches, stars, and per-player whistle splits when enriched. */
  personnel?: GamePersonnelSnapshot;
  /** Play-level NFL penalties with leverage scoring when ingested. */
  penaltyEvents?: import("@/lib/types").NflPenaltyEvent[];
  /** Play-level scoring timeline for momentum run detection (basketball). */
  scoringPlays?: import("@/lib/types").ScoringPlayEvent[];
  /** Crew-initiated stoppages aligned to the scoring timeline. */
  crewStoppages?: import("@/lib/types").CrewStoppageEvent[];
  highLeverageImpact?: number;
  highLeverageFlagRate?: number;
  subjectiveFlags?: number;
  administrativeFlags?: number;
}

export interface RuntimeGameLogFile {
  lastUpdated: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA";
  source: string;
  games: RuntimeGameLogEntry[];
}

export type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA";

const GAME_LOG_GLOBAL_KEYS = freezeWorkerConfig({
  NBA: "__REFWATCH_NBA_GAME_LOGS__",
  NHL: "__REFWATCH_NHL_GAME_LOGS__",
  NFL: "__REFWATCH_NFL_GAME_LOGS__",
  EPL: "__REFWATCH_EPL_GAME_LOGS__",
  LALIGA: "__REFWATCH_LALIGA_GAME_LOGS__",
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
  WNBA: "__REFWATCH_WNBA_GAME_LOGS__",
} as const);

const GAME_LOG_ASSET_BASE = freezeWorkerConfig({
  NBA: "/data/nba",
  NHL: "/data/nhl",
  NFL: "/data/nfl",
  EPL: "/data/epl",
  LALIGA: "/data/laliga",
  CBB: "/data/cbb",
  CFB: "/data/cfb",
  WNBA: "/data/wnba",
} as const);

function readGlobalGameLogs(league: DataLeague): RuntimeGameLogFile | null {
  const key = GAME_LOG_GLOBAL_KEYS[league];
  return (globalThis as unknown as Record<string, RuntimeGameLogFile | undefined>)[key] ?? null;
}

export function getCachedGameLogs(league: DataLeague): RuntimeGameLogFile | null {
  return getWorkerIsolateStore().gameLogs[league] ?? readGlobalGameLogs(league);
}

export function setCachedGameLogs(
  league: DataLeague,
  data: RuntimeGameLogFile,
): void {
  getWorkerIsolateStore().gameLogs[league] = data;
  const key = GAME_LOG_GLOBAL_KEYS[league];
  (globalThis as unknown as Record<string, RuntimeGameLogFile | undefined>)[key] = data;
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
      const res = await safeOriginFetch(origin, `/data/nba/game-logs/${season}.ndjson`);
      if (!res?.ok) continue;
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
    let data: unknown = await fetchStaticJson(origin, `${GAME_LOG_ASSET_BASE[league]}/game-logs.json`);
    if (isGameLogsPayload(data) && data.games.length > 0) {
      setCachedGameLogs(league, data as RuntimeGameLogFile);
    }
    data = releaseParsedPayload(data);
  } catch {
    // Never fail SSR from game-log preload.
  }
}

const LIVE_SLATE_GAME_LOG_LEAGUES: readonly DataLeague[] = [
  "NBA",
  "NHL",
  "NFL",
  "EPL",
  "LALIGA",
  "WNBA",
  "CBB",
];

/** Hydrate game logs for live slate rebuilds on Workers (/api/slate, overview hub). */
export async function preloadGameLogsForLiveSlate(origin: string): Promise<void> {
  if (!origin?.trim()) return;

  for (const league of LIVE_SLATE_GAME_LOG_LEAGUES) {
    try {
      await preloadGameLogsFromAssets(origin, league);
    } catch (error) {
      console.error("[refwatch] live slate game-log preload failed", league, error);
    }
  }
}
