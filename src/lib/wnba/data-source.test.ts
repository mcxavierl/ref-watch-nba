import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWnbaSimulatedData,
  isWnbaVerifiedData,
} from "@/lib/wnba/data-source";
import { resolveLeagueVerification } from "@/lib/league-verification";
import type { RefStatsFile } from "@/lib/types";

describe("wnba data source", () => {
  it("treats ESPN ingest as verified", () => {
    assert.equal(isWnbaVerifiedData("espn"), true);
    assert.equal(isWnbaVerifiedData("wnba-stats-api"), true);
    assert.equal(isWnbaSimulatedData("seeded"), true);
  });

  it("resolves verified WNBA league stats from ESPN meta", () => {
    const meta: RefStatsFile["meta"] = {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      seasons: ["2024-25"],
      leagueAvgTotal: 165,
      leagueAvgFouls: 34,
      leagueOverBaseline: 165,
      minSampleSize: 30,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
    };
    const verification = resolveLeagueVerification("wnba", meta);
    assert.equal(verification.data_verified, true);
    assert.equal(verification.canRenderStats, true);
  });
});
