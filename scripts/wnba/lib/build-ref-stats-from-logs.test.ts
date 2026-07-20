import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWnbaRefStatsFromLogs } from "./build-ref-stats-from-logs";
import { toWnbaOfficials } from "./espn";
import type { GameLogEntry } from "../../lib/game-logs";

function sampleGame(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return {
    gameId: "401620178",
    date: "2024-05-14",
    season: "2024-25",
    league: "WNBA",
    homeTeam: "NYL",
    awayTeam: "IND",
    homeScore: 85,
    awayScore: 80,
    totalPoints: 165,
    totalFouls: 34,
    closingTotal: 165,
    homeSpread: 0,
    lineSource: "synthetic",
    officials: [
      { name: "Charles Watson", number: 0, role: "crew_chief" },
      { name: "Tim Greene", number: 0, role: "referee" },
      { name: "Biniam Maru", number: 0, role: "umpire" },
    ],
    ...overrides,
  };
}

describe("WNBA ref stats builder", () => {
  it("creates ref profiles from game logs with officials", () => {
    const stats = buildWnbaRefStatsFromLogs([
      sampleGame(),
      sampleGame({
        gameId: "401620179",
        date: "2024-05-16",
        awayTeam: "DAL",
        homeTeam: "SEA",
      }),
    ]);

    assert.equal(stats.refs.length, 3);
    assert.ok(stats.refs.every((ref) => ref.games >= 1));
    assert.ok(stats.refs.some((ref) => ref.name === "Charles Watson"));
    assert.equal(stats.meta.refCount, 3);
  });

  it("skips officials with blank names", () => {
    const stats = buildWnbaRefStatsFromLogs([
      sampleGame({
        officials: [
          { name: "", number: 0, role: "crew_chief" },
          { name: "Tim Greene", number: 0, role: "referee" },
        ],
      }),
    ]);

    assert.equal(stats.refs.length, 1);
    assert.equal(stats.refs[0]?.name, "Tim Greene");
  });

  it("maps ESPN summary officials into RefOfficial rows", () => {
    const officials = toWnbaOfficials(
      [
        { fullName: "Charles Watson", positionName: "Crew Chief" },
        { fullName: "Tim Greene", positionName: "Referee" },
        { fullName: "Biniam Maru", positionName: "Umpire" },
      ],
      new Map(),
    );
    assert.equal(officials.length, 3);
    assert.equal(officials[0]?.role, "crew_chief");
    assert.equal(officials[1]?.role, "referee");
    assert.equal(officials[2]?.role, "umpire");
  });
});
