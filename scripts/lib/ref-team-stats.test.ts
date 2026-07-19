import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefTeamStat } from "./ref-team-stats";

describe("ref team stats W-L", () => {
  it("excludes regulation ties from straight-up losses", () => {
    const stat = buildRefTeamStat([
      { foulDifferential: 0, totalPoints: 45, overHit: true, teamWin: true },
      { foulDifferential: 0, totalPoints: 42, overHit: false, teamWin: false },
      {
        foulDifferential: 0,
        totalPoints: 40,
        overHit: false,
        teamWin: false,
        teamTie: true,
      },
    ]);
    assert.equal(stat.games, 3);
    assert.equal(stat.wins, 1);
    assert.equal(stat.losses, 1);
    assert.equal(stat.ties, 1);
  });
});
