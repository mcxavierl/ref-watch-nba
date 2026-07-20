import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TeamCrewSplit } from "@/lib/types";
import { teamIndexGameCount, countUniqueOfficialsFromSplits } from "@/lib/team-index-game-counts";

describe("teamIndexGameCount", () => {
  it("falls back to crew-split totals when logs exist but return zero games", () => {
    const splits: TeamCrewSplit[] = [
      {
        crewKey: "a",
        crewNames: ["A"],
        games: 10,
        avgTotalPoints: 140,
        overRate: 0.5,
        avgFouls: 30,
        wins: 6,
        losses: 4,
      } as TeamCrewSplit,
    ];
    const counts = new Map<string, number>([["ZZZZ", 0]]);

    assert.equal(
      teamIndexGameCount("cbb", "ZZZZ", splits, counts),
      10,
      "prefer crew-split W-L when indexed log count is zero",
    );
  });
});

describe("countUniqueOfficialsFromSplits", () => {
  it("counts distinct officials across crew combinations", () => {
    const splits: TeamCrewSplit[] = [
      {
        crewKey: "a",
        crewNames: ["Alice", "Bob"],
        games: 3,
      } as TeamCrewSplit,
      {
        crewKey: "b",
        crewNames: ["Bob", "Carol"],
        games: 2,
      } as TeamCrewSplit,
    ];

    assert.equal(countUniqueOfficialsFromSplits(splits), 3);
  });
});
