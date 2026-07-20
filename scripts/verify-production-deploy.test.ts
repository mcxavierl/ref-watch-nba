import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isWnbaOfficialsPending } from "./lib/volume-regression";
import type { RefStatsFile } from "../src/lib/types";

describe("production deploy verify guardrails", () => {
  it("allows WNBA game-log-only payloads with zero refs when officials are pending", () => {
    const stats: RefStatsFile = {
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
    assert.equal(isWnbaOfficialsPending(stats), true);
  });

  it("verify-production-deploy.ts exempts WNBA officials-pending payloads", () => {
    const source = readFileSync("scripts/verify-production-deploy.ts", "utf8");
    assert.match(source, /isWnbaOfficialsPending/);
    assert.match(source, /wnbaOfficialsPending/);
  });
});
