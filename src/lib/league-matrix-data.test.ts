import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  closeGameDefinitionForLeague,
  filterLeagueMatrixEntries,
  leagueMatrixFilterLabel,
} from "@/lib/league-matrix-data";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";

function entry(
  slug: string,
  winRate: number,
  games = 12,
): TeamRefLeaderboardEntry {
  return {
    slug,
    name: slug,
    games,
    avgFoulDifferential: 0.5,
    avgTotalPoints: 220,
    overRate: 0.5,
    winRate,
  };
}

describe("league matrix data", () => {
  it("labels filter modes for segmented control", () => {
    assert.equal(leagueMatrixFilterLabel("all"), "All");
    assert.equal(leagueMatrixFilterLabel("favorable"), "Favorable (Top 10)");
  });

  it("sorts favorable refs by win rate descending and caps at 10", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      entry(`ref-${i}`, 0.4 + i * 0.04),
    );
    const favorable = filterLeagueMatrixEntries(pool, "favorable", "winRate-desc");
    assert.equal(favorable.length, 10);
    assert.equal(favorable[0]?.slug, "ref-11");
    assert.equal(favorable[9]?.slug, "ref-2");
  });

  it("sorts unfavorable refs by win rate ascending", () => {
    const pool = [entry("a", 0.7), entry("b", 0.3), entry("c", 0.5)];
    const unfavorable = filterLeagueMatrixEntries(pool, "unfavorable", "winRate-desc");
    assert.deepEqual(unfavorable.map((row) => row.slug), ["b", "c", "a"]);
  });

  it("describes close-game thresholds per league", () => {
    assert.match(closeGameDefinitionForLeague("NHL"), /2 goals/);
    assert.match(closeGameDefinitionForLeague("NBA"), /5 points/);
    assert.match(closeGameDefinitionForLeague("NFL"), /7 points/);
  });
});
