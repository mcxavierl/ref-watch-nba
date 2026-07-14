import { AsyncLocalStorage } from "node:async_hooks";
import type {
  RuntimeGameLogEntry,
  RuntimeGameLogFile,
  DataLeague,
} from "@/lib/game-logs-preload";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";

export type NcaaConferenceMap = Map<string, readonly string[]>;
export type NcaaGameShardMap = Map<string, RuntimeGameLogEntry[]>;

export interface NcaaSportComponents {
  league: "CBB" | "CFB";
  conferenceMap: NcaaConferenceMap;
  gameShards: NcaaGameShardMap;
  meta: {
    lastUpdated: string | null;
    source: string | null;
    totalGames: number;
  };
}

/** Release NCAA component maps without retaining shard arrays across requests. */
export function clearNcaaSportComponents(
  components: NcaaSportComponents | null | undefined,
): void {
  if (!components) return;
  components.conferenceMap.clear();
  for (const shard of components.gameShards.values()) {
    shard.length = 0;
  }
  components.gameShards.clear();
}

export type WorkerDataLeague =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

/** Legacy globalThis keys that must not retain JSON across warm isolates. */
export const LEGACY_HYDRATION_GLOBAL_KEYS = [
  "__REFWATCH_NBA_REF_STATS__",
  "__REFWATCH_NHL_REF_STATS__",
  "__REFWATCH_NFL_REF_STATS__",
  "__REFWATCH_CBB_REF_STATS__",
  "__REFWATCH_CFB_REF_STATS__",
  "__REFWATCH_EPL_REF_STATS__",
  "__REFWATCH_LALIGA_REF_STATS__",
  "__REFWATCH_NBA_TEAM_SPLITS__",
  "__REFWATCH_NHL_TEAM_SPLITS__",
  "__REFWATCH_NFL_TEAM_SPLITS__",
  "__REFWATCH_EPL_TEAM_SPLITS__",
  "__REFWATCH_LALIGA_TEAM_SPLITS__",
  "__REFWATCH_CBB_TEAM_SPLITS__",
  "__REFWATCH_NBA_GAME_LOGS__",
  "__REFWATCH_NHL_GAME_LOGS__",
  "__REFWATCH_NFL_GAME_LOGS__",
  "__REFWATCH_EPL_GAME_LOGS__",
  "__REFWATCH_LALIGA_GAME_LOGS__",
  "__REFWATCH_CBB_GAME_LOGS__",
  "__REFWATCH_CFB_GAME_LOGS__",
  "__REFWATCH_CBB_NCAA_COMPONENTS__",
  "__REFWATCH_CFB_NCAA_COMPONENTS__",
  "__REFWATCH_SCOPED_STATS_CACHE__",
] as const;

export const WORKER_ISOLATE_RUN_SYMBOL = Symbol.for(
  "__refwatch_run_worker_isolate__",
);
export const WORKER_ISOLATE_END_SYMBOL = Symbol.for(
  "__refwatch_end_worker_isolate__",
);

export type WorkerIsolateStore = {
  requestActive: boolean;
  refStats: Partial<Record<WorkerDataLeague, RefStatsFile>>;
  teamSplits: Partial<Record<WorkerDataLeague, Record<string, TeamCrewSplit[]>>>;
  gameLogs: Partial<Record<DataLeague, RuntimeGameLogFile>>;
  /** NCAA basketball conference maps + season game shards (request-scoped). */
  ncaaBasketballComponents?: NcaaSportComponents | null;
  /** NCAA football conference maps + season game shards (request-scoped). */
  ncaaFootballComponents?: NcaaSportComponents | null;
  scopedStats: Map<string, RefStatsFile>;
  matrixCompute: Map<string, unknown>;
  matrixAtsEnrich: Map<string, RefStatsFile>;
  marketExpectationEnrich: Map<string, RefStatsFile>;
};

const isolateAls = new AsyncLocalStorage<WorkerIsolateStore>();
const endCallbacks: Array<() => void> = [];

function createEmptyStore(): WorkerIsolateStore {
  return {
    requestActive: false,
    refStats: {},
    teamSplits: {},
    gameLogs: {},
    ncaaBasketballComponents: null,
    ncaaFootballComponents: null,
    scopedStats: new Map(),
    matrixCompute: new Map(),
    matrixAtsEnrich: new Map(),
    marketExpectationEnrich: new Map(),
  };
}

/** Freeze static lookup tables allowed in module scope for warm starts. */
export function freezeWorkerConfig<T extends object>(config: T): Readonly<T> {
  return Object.freeze(config);
}

export function isWorkerHydrationRuntime(): boolean {
  return !allowNodeDataFs();
}

export function registerWorkerIsolateEndCallback(callback: () => void): void {
  endCallbacks.push(callback);
}

export function clearLegacyGlobalHydration(): void {
  const g = globalThis as Record<string, unknown>;
  for (const key of LEGACY_HYDRATION_GLOBAL_KEYS) {
    g[key] = undefined;
  }
}

function clearMutableStore(store: WorkerIsolateStore): void {
  store.requestActive = false;
  store.refStats = {};
  store.teamSplits = {};
  store.gameLogs = {};
  clearNcaaSportComponents(store.ncaaBasketballComponents);
  clearNcaaSportComponents(store.ncaaFootballComponents);
  store.ncaaBasketballComponents = null;
  store.ncaaFootballComponents = null;
  store.scopedStats.clear();
  store.matrixCompute.clear();
  store.matrixAtsEnrich.clear();
  store.marketExpectationEnrich.clear();
}

function runEndCallbacks(): void {
  for (const callback of endCallbacks) {
    try {
      callback();
    } catch {
      // Never fail request teardown from a cache callback.
    }
  }
}

/**
 * Wrap the OpenNext handler so hydration caches live only for this fetch.
 * Registered on globalThis for the patched worker entry to invoke.
 */
export async function runWithWorkerIsolateStore<T>(
  fn: () => T | Promise<T>,
): Promise<T> {
  const active = isolateAls.getStore();
  if (active?.requestActive) {
    return fn();
  }

  clearLegacyGlobalHydration();
  runEndCallbacks();

  return isolateAls.run(createEmptyStore(), async () => {
    const store = isolateAls.getStore()!;
    store.requestActive = true;
    try {
      return await fn();
    } finally {
      endWorkerIsolateRequest();
    }
  });
}

/**
 * Layout hydration entry: ensure a request-scoped store exists before JSON fetch.
 * Does not tear down — that happens when the Worker fetch handler completes.
 */
export function beginWorkerIsolateRequest(): void {
  clearLegacyGlobalHydration();
  const store = isolateAls.getStore();
  if (store?.requestActive) return;

  if (store) {
    clearMutableStore(store);
    store.requestActive = true;
    return;
  }

  const fresh = createEmptyStore();
  fresh.requestActive = true;
  isolateAls.enterWith(fresh);
}

/** End-of-request: release heavy refs so the isolate cannot grow across fetches. */
export function endWorkerIsolateRequest(): void {
  const store = isolateAls.getStore();
  if (store) {
    clearMutableStore(store);
  }
  clearLegacyGlobalHydration();
  runEndCallbacks();
  isolateAls.enterWith(createEmptyStore());
}

export function getWorkerIsolateStore(): WorkerIsolateStore {
  const existing = isolateAls.getStore();
  if (existing) return existing;
  const store = createEmptyStore();
  isolateAls.enterWith(store);
  return store;
}

/** Drop a large parsed payload reference before awaiting more I/O. */
export function releaseParsedPayload<T>(value: T | null | undefined): null {
  void value;
  return null;
}

const globalRegistry = globalThis as Record<symbol, unknown>;
globalRegistry[WORKER_ISOLATE_RUN_SYMBOL] = runWithWorkerIsolateStore;
globalRegistry[WORKER_ISOLATE_END_SYMBOL] = endWorkerIsolateRequest;
