import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBundledLeagueRefStatsCore,
  getBundledNbaRefStatsCore,
} from "@/lib/ref-stats-bundled";

test("bundled ref-stats core has hero counts for compact leagues", () => {
  const nba = getBundledNbaRefStatsCore();
  assert.ok(nba?.refs?.length);
  assert.ok(nba.meta.totalGamesProcessed);

  for (const league of ["nfl", "nhl", "epl", "laliga", "cbb"] as const) {
    const stats = getBundledLeagueRefStatsCore(league);
    assert.ok(stats?.refs?.length, `${league} refs`);
    assert.ok(stats.meta.totalGamesProcessed, `${league} games`);
    assert.equal(stats.meta.data_verified, true, `${league} verified`);
  }

  const wnba = getBundledLeagueRefStatsCore("wnba");
  assert.ok(wnba, "wnba bundled core");
  assert.ok((wnba?.refs?.length ?? 0) > 0, "wnba refs");
  assert.ok((wnba?.meta.totalGamesProcessed ?? 0) > 0, "wnba games");
  assert.equal(wnba?.meta.data_verified, true, "wnba verified");
  assert.equal(wnba?.meta.refCount, wnba?.refs?.length, "wnba refCount matches refs");
});
