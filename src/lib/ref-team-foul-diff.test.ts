import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  avgFoulDifferentialFromTeamSplits,
  resolveRefTeamFoulDifferential,
} from "@/lib/ref-team-foul-diff";
import type { TeamCrewSplit } from "@/lib/types";

const splits: TeamCrewSplit[] = [
  {
    crewKey: "josh-tiven-58|sean-wright-4",
    crewNames: ["Josh Tiven", "Sean Wright"],
    games: 2,
    avgTotalPoints: 216,
    overRate: 0,
    avgFouls: 39,
    wins: 1,
    losses: 1,
    totalDelta: -7.2,
    homeGames: 2,
    awayGames: 0,
    homeWins: 1,
    homeLosses: 1,
    awayWins: 0,
    awayLosses: 0,
    avgTeamFouls: 20.5,
    avgOpponentFouls: 18.5,
    foulDifferential: 2,
  },
  {
    crewKey: "other-ref-1|other-ref-2",
    crewNames: ["Other Ref"],
    games: 3,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    wins: 2,
    losses: 1,
    totalDelta: 0,
    homeGames: 1,
    awayGames: 2,
    homeWins: 1,
    homeLosses: 0,
    awayWins: 1,
    awayLosses: 1,
    avgTeamFouls: 20,
    avgOpponentFouls: 20,
    foulDifferential: 0,
  },
];

describe("ref-team foul differential helpers", () => {
  it("weights crew foul edges by games for a matching ref slug", () => {
    assert.equal(
      avgFoulDifferentialFromTeamSplits("josh-tiven-58", "ATL", splits),
      2,
    );
    assert.equal(
      avgFoulDifferentialFromTeamSplits("other-ref-1", "ATL", splits),
      0,
    );
    assert.equal(
      avgFoulDifferentialFromTeamSplits("missing-ref-9", "ATL", splits),
      null,
    );
  });

  it("falls back to crew splits when stored avgFoulDifferential is zero", () => {
    assert.equal(
      resolveRefTeamFoulDifferential("josh-tiven-58", "ATL", {
        avgFoulDifferential: 0,
      }, splits),
      2,
    );
    assert.equal(
      resolveRefTeamFoulDifferential("josh-tiven-58", "ATL", {
        avgFoulDifferential: -1.4,
      }, splits),
      -1.4,
    );
  });
});
