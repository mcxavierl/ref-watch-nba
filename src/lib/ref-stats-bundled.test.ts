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

  for (const league of ["epl", "laliga"] as const) {
    const stats = getBundledLeagueRefStatsCore(league);
    assert.ok(stats?.refs?.length, `${league} refs`);
    assert.ok(stats.meta.totalGamesProcessed, `${league} games`);
    assert.equal(stats.meta.data_verified, true, `${league} verified`);
  }
});
