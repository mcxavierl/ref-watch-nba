import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isRefStatsOfficialsPending,
  validateRefStatsAsset,
} from "./verify-ref-stats-asset";
import type { RefStatsFile } from "../../src/lib/types";

const wnbaGameLogOnly: RefStatsFile = {
  meta: {
    lastUpdated: "2026-07-20T00:00:00.000Z",
    seasons: ["2025-26"],
    leagueAvgTotal: 165,
    leagueAvgFouls: 34,
    leagueOverBaseline: 165,
    minSampleSize: 30,
    source: "wnba-stats-api",
    data_verified: true,
    totalGamesProcessed: 528,
    atsAvailable: false,
  },
  refs: [],
  teamSplits: {},
};

describe("verify-ref-stats-asset", () => {
  it("allows WNBA game-log-only payloads with zero refs", () => {
    const path = "public/data/wnba/ref-stats.json";
    assert.equal(isRefStatsOfficialsPending(path, wnbaGameLogOnly), true);
    assert.deepEqual(validateRefStatsAsset(path, wnbaGameLogOnly), []);
  });

  it("rejects verified leagues with empty refs", () => {
    const path = "public/data/nba/ref-stats.json";
    const stats: RefStatsFile = {
      ...wnbaGameLogOnly,
      meta: { ...wnbaGameLogOnly.meta, source: "nba-stats-api" },
    };
    assert.equal(isRefStatsOfficialsPending(path, stats), false);
    assert.match(
      validateRefStatsAsset(path, stats).join("\n"),
      /refs array is empty/,
    );
  });

  it("rejects payloads with zero games or unverified meta", () => {
    const path = "public/data/wnba/ref-stats.json";
    const noGames: RefStatsFile = {
      ...wnbaGameLogOnly,
      meta: { ...wnbaGameLogOnly.meta, totalGamesProcessed: 0 },
    };
    assert.match(
      validateRefStatsAsset(path, noGames).join("\n"),
      /totalGamesProcessed is 0/,
    );

    const unverified: RefStatsFile = {
      ...wnbaGameLogOnly,
      meta: { ...wnbaGameLogOnly.meta, data_verified: false },
    };
    assert.match(
      validateRefStatsAsset(path, unverified).join("\n"),
      /data_verified is false/,
    );
  });

  it("deploy gates import the shared validator", () => {
    for (const file of [
      "scripts/verify-production-deploy.ts",
      "scripts/check-deploy-readiness.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /validateRefStatsAsset/);
    }
  });
});
