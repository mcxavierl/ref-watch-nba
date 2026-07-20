import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  closeGameMarginThreshold,
  isCloseGameByMargin,
} from "@/lib/team-ref-close-games";
import { formatTeamRefCloseGamesTooltip } from "@/lib/team-ref-close-games-display";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

function sampleGame(
  overrides: Partial<RuntimeGameLogEntry> = {},
): RuntimeGameLogEntry {
  return {
    gameId: "g1",
    date: "2024-01-15",
    season: "2023-24",
    homeTeam: "ANA",
    awayTeam: "BOS",
    homeScore: 3,
    awayScore: 2,
    totalPoints: 5,
    totalFouls: 10,
    closingTotal: 5.5,
    homeSpread: -1.5,
    league: "NHL",
    lineSource: "external" as const,
    officials: [{ name: "Test Ref", number: 42, role: "referee" }],
    ...overrides,
  };
}

describe("team ref close games", () => {
  it("uses league-aware margin thresholds", () => {
    assert.equal(closeGameMarginThreshold("NHL"), 2);
    assert.equal(closeGameMarginThreshold("NBA"), 5);
    assert.equal(closeGameMarginThreshold("NFL"), 7);
  });

  it("flags close games by final margin", () => {
    assert.equal(isCloseGameByMargin(sampleGame(), "NHL"), true);
    assert.equal(
      isCloseGameByMargin(sampleGame({ homeScore: 5, awayScore: 2 }), "NHL"),
      false,
    );
    assert.equal(
      isCloseGameByMargin(sampleGame({ homeScore: 110, awayScore: 104 }), "NBA"),
      false,
    );
  });

  it("formats close-game tooltip copy", () => {
    const tooltip = formatTeamRefCloseGamesTooltip(
      {
        closeCount: 1,
        totalGames: 4,
        closeGames: [
          {
            date: "2024-01-15",
            opponent: "BOS",
            teamScore: 3,
            opponentScore: 2,
            margin: 1,
          },
        ],
      },
      "the Ducks",
      "NHL",
    );
    assert.match(tooltip ?? "", /Close games for the Ducks/);
    assert.match(tooltip ?? "", /2024-01-15 vs BOS/);
  });
});
