import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  homeAtsResult,
  teamAtsResult,
  getTeamAtsSampleRecord,
} from "@/lib/team-ats";
import type { TeamCrewSplit } from "@/lib/types";

describe("teamAtsResult", () => {
  it("returns home ATS cover when favorite wins by enough", () => {
    assert.equal(homeAtsResult(28, 21, -3.5), "win");
    assert.equal(teamAtsResult(true, 28, 21, -3.5, true), "win");
  });

  it("returns away ATS cover when home fails to cover", () => {
    assert.equal(teamAtsResult(false, 24, 21, -3.5, true), "win");
  });

  it("returns null without a closing line", () => {
    assert.equal(teamAtsResult(true, 24, 21, -3.5, false), null);
  });
});

describe("getTeamAtsSampleRecord", () => {
  it("aggregates ATS splits and returns n/a rate when empty", () => {
    const splits: TeamCrewSplit[] = [
      {
        crewKey: "a",
        crewNames: ["A"],
        games: 10,
        avgTotalPoints: 45,
        overRate: 0.5,
        avgFouls: 10,
        wins: 6,
        losses: 4,
        totalDelta: 0,
        homeGames: 5,
        awayGames: 5,
        homeWins: 3,
        homeLosses: 2,
        awayWins: 3,
        awayLosses: 2,
        atsWins: 7,
        atsLosses: 3,
        atsGames: 10,
        avgTeamFouls: 5,
        avgOpponentFouls: 5,
        foulDifferential: 0,
      },
    ];
    const record = getTeamAtsSampleRecord(splits);
    assert.equal(record.atsGames, 10);
    assert.equal(record.atsCoverRate, 0.7);
  });
});
