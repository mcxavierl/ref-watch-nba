import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginWorkerIsolateRequest,
  clearLegacyGlobalHydration,
  endWorkerIsolateRequest,
  getWorkerIsolateStore,
  LEGACY_HYDRATION_GLOBAL_KEYS,
  runWithWorkerIsolateStore,
} from "@/lib/worker-isolate-store";
import {
  getNcaaBasketballComponents,
  getNcaaFootballComponents,
  setNcaaSportComponents,
  type NcaaSportComponents,
} from "@/lib/ncaa-isolate-components";
import {
  getCachedRefStats,
  setCachedRefStats,
} from "@/lib/ref-stats-preload";
import type { RefStatsFile } from "@/lib/types";

const stubStats = {
  meta: {
    lastUpdated: "2026-01-01T00:00:00.000Z",
    seasons: ["2024-25"],
    leagueAvgTotal: 220,
    leagueAvgFouls: 20,
    leagueOverBaseline: 220,
    minSampleSize: 30,
    source: "seeded",
    data_verified: true,
    data_source: "test",
    atsAvailable: false,
    refCount: 1,
    totalGamesProcessed: 1,
    dateRange: { earliest: "2024-01-01", latest: "2024-01-02" },
  },
  refs: [
    {
      slug: "test-ref-1",
      name: "Test Ref",
      number: 1,
      games: 10,
      avgTotalPoints: 220,
      overRate: 0.5,
      avgFouls: 20,
      homeCoverRate: null,
      totalPointsDelta: 0,
      foulsDelta: 0,
      seasons: ["2024-25"],
      recentGames: [],
    },
  ],
  teamSplits: {},
} as RefStatsFile;

describe("worker isolate store", () => {
  it("stores hydration in request scope instead of globalThis", () => {
    beginWorkerIsolateRequest();
    setCachedRefStats("nba", stubStats);
    assert.equal(getCachedRefStats("nba")?.refs.length, 1);
    for (const key of LEGACY_HYDRATION_GLOBAL_KEYS) {
      assert.equal((globalThis as Record<string, unknown>)[key], undefined);
    }
    endWorkerIsolateRequest();
    assert.equal(getCachedRefStats("nba"), null);
  });

  it("clears legacy globals on beginWorkerIsolateRequest", () => {
    (globalThis as Record<string, unknown>).__REFWATCH_NBA_REF_STATS__ = stubStats;
    beginWorkerIsolateRequest();
    assert.equal(
      (globalThis as Record<string, unknown>).__REFWATCH_NBA_REF_STATS__,
      undefined,
    );
    endWorkerIsolateRequest();
  });

  it("drops scoped compute caches when the request ends", () => {
    beginWorkerIsolateRequest();
    getWorkerIsolateStore().matrixCompute.set("key", { sample: true });
    getWorkerIsolateStore().marketExpectationEnrich.set("key", stubStats);
    endWorkerIsolateRequest();
    assert.equal(getWorkerIsolateStore().matrixCompute.size, 0);
    assert.equal(getWorkerIsolateStore().marketExpectationEnrich.size, 0);
    clearLegacyGlobalHydration();
  });

  it("runWithWorkerIsolateStore scopes nested work to one request", async () => {
    await runWithWorkerIsolateStore(async () => {
      assert.equal(getWorkerIsolateStore().requestActive, true);
      setCachedRefStats("nba", stubStats);
      assert.equal(getCachedRefStats("nba")?.refs.length, 1);
    });
    assert.equal(getWorkerIsolateStore().requestActive, false);
    assert.equal(getCachedRefStats("nba"), null);
  });

  it("clears NCAA component maps when the request ends", () => {
    beginWorkerIsolateRequest();
    const components: NcaaSportComponents = {
      league: "CFB",
      conferenceMap: new Map([["SEC", ["ALA", "UGA"]]]),
      gameShards: new Map([["2024-25", [{ gameId: "1" } as never]]]),
      meta: { lastUpdated: "2026-01-01", source: "test", totalGames: 1 },
    };
    setNcaaSportComponents("cfb", components);
    assert.equal(getNcaaFootballComponents()?.meta.totalGames, 1);
    endWorkerIsolateRequest();
    assert.equal(getNcaaFootballComponents(), null);
    assert.equal(getNcaaBasketballComponents(), null);
    assert.equal(getWorkerIsolateStore().ncaaFootballComponents, null);
    assert.equal(components.conferenceMap.size, 0);
    assert.equal(components.gameShards.size, 0);
  });
});
