import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTeamGameCountMap,
  countDistinctGames,
  countTeamGamesFromLogs,
  gameCountDeviationPct,
  gameCountFromCrewSplits,
} from "@/lib/game-count";
import type { TeamCrewSplit } from "@/lib/types";

describe("countDistinctGames", () => {
  it("dedupes duplicate gameIds", () => {
    const n = countDistinctGames([
      { gameId: "a" },
      { gameId: "a" },
      { gameId: "b" },
    ]);
    assert.equal(n, 2);
  });
});

describe("countTeamGamesFromLogs", () => {
  const games = [
    {
      gameId: "g1",
      season: "2016-17",
      homeTeam: "LAR",
      awayTeam: "SF",
    },
    {
      gameId: "g2",
      season: "2015-16",
      homeTeam: "LAR",
      awayTeam: "SEA",
    },
    {
      gameId: "g3",
      season: "2016-17",
      homeTeam: "KC",
      awayTeam: "LAR",
    },
  ];

  it("counts distinct team games in season window", () => {
    assert.equal(
      countTeamGamesFromLogs(games, "LAR", ["2016-17"]),
      2,
    );
  });

  it("counts all-time when seasons omitted", () => {
    assert.equal(countTeamGamesFromLogs(games, "LAR"), 3);
  });
});

describe("buildTeamGameCountMap", () => {
  it("maps each team to distinct game count", () => {
    const map = buildTeamGameCountMap(
      [
        { gameId: "g1", season: "2020-21", homeTeam: "LAL", awayTeam: "BOS" },
        { gameId: "g2", season: "2020-21", homeTeam: "LAL", awayTeam: "MIA" },
      ],
      ["2020-21"],
    );
    assert.equal(map.get("LAL"), 2);
    assert.equal(map.get("BOS"), 1);
  });
});

describe("gameCountFromCrewSplits", () => {
  it("sums wins and losses across crews", () => {
    const splits: TeamCrewSplit[] = [
      {
        crewKey: "a",
        crewNames: ["A"],
        games: 10,
        wins: 6,
        losses: 4,
      } as TeamCrewSplit,
      {
        crewKey: "b",
        crewNames: ["B"],
        games: 5,
        wins: 3,
        losses: 2,
      } as TeamCrewSplit,
    ];
    assert.equal(gameCountFromCrewSplits(splits), 15);
  });
});

describe("gameCountDeviationPct", () => {
  it("returns percent deviation", () => {
    assert.equal(gameCountDeviationPct(180, 165), 9.090909090909092);
  });
});

describe("team index integrity", () => {
  it("prefers DISTINCT game_id counts over summed crew-split games", () => {
    const scopedSeasons = ["2016-17"];
    const games = [
      { gameId: "g1", season: "2016-17", homeTeam: "LAR", awayTeam: "SF" },
      { gameId: "g2", season: "2016-17", homeTeam: "SEA", awayTeam: "LAR" },
      { gameId: "g3", season: "2016-17", homeTeam: "LAR", awayTeam: "KC" },
    ];
    const logCount = countTeamGamesFromLogs(games, "LAR", scopedSeasons);
    const splitSum = gameCountFromCrewSplits([
      {
        crewKey: "crew-a",
        crewNames: ["Crew A"],
        games: 3,
        wins: 2,
        losses: 1,
      } as TeamCrewSplit,
      {
        crewKey: "crew-b",
        crewNames: ["Crew B"],
        games: 3,
        wins: 1,
        losses: 2,
      } as TeamCrewSplit,
    ]);
    assert.equal(logCount, 3);
    assert.ok(splitSum > logCount, "split sum inflates without DISTINCT game_id");
  });
});
