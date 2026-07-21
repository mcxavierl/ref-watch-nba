import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEspnGameLive,
  resolveSlateGamePhase,
  formatSlateGameClock,
} from "@/lib/slate-game-phase";
import {
  mergeSlateLiveScores,
  parseEspnScoreboardEvents,
} from "@/lib/slate-live-scores";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

function slateEntry(
  overrides: Partial<OverviewSlateEntry> & Pick<OverviewSlateEntry, "leagueId" | "gameId">,
): OverviewSlateEntry {
  return {
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    matchup: "LVA @ TOR",
    awayTeam: "LVA",
    homeTeam: "TOR",
    crewCount: 3,
    status: "live",
    ...overrides,
  };
}

describe("slate-game-phase", () => {
  it("detects live and final ESPN statuses", () => {
    assert.equal(isEspnGameLive("STATUS_IN_PROGRESS"), true);
    assert.equal(isEspnGameLive("STATUS_HALFTIME"), true);
    assert.equal(isEspnGameLive("STATUS_SCHEDULED"), false);
    assert.equal(resolveSlateGamePhase("STATUS_FINAL"), "final");
    assert.equal(resolveSlateGamePhase("STATUS_IN_PROGRESS"), "live");
    assert.equal(formatSlateGameClock("STATUS_FINAL"), "Final");
    assert.equal(formatSlateGameClock("STATUS_HALFTIME"), "Halftime");
    assert.equal(formatSlateGameClock("STATUS_IN_PROGRESS", "4:12", "Q3"), "Q3 4:12");
  });
});

describe("slate-live-scores", () => {
  it("parses ESPN scoreboard events with scores and clock", () => {
    const scores = parseEspnScoreboardEvents("wnba", {
      events: [
        {
          id: "401857083",
          status: { type: { name: "STATUS_IN_PROGRESS" }, displayClock: "5:42", period: 3 },
          competitions: [
            {
              status: { type: { name: "STATUS_IN_PROGRESS" }, displayClock: "5:42", period: 3 },
              competitors: [
                { homeAway: "away", score: "54", team: { abbreviation: "LV" } },
                { homeAway: "home", score: "52", team: { abbreviation: "TOR" } },
              ],
            },
          ],
        },
      ],
    });

    assert.equal(scores.length, 1);
    assert.equal(scores[0]?.gameId, "401857083");
    assert.equal(scores[0]?.awayScore, 54);
    assert.equal(scores[0]?.homeScore, 52);
    assert.equal(scores[0]?.gamePhase, "live");
    assert.equal(scores[0]?.gameClock, "Q3 5:42");
  });

  it("merges live scores into slate entries and promotes status", () => {
    const games = [
      slateEntry({
        leagueId: "wnba",
        gameId: "401857083",
        status: "live",
        gamePhase: "pregame",
      }),
    ];

    const merged = mergeSlateLiveScores(games, [
      {
        leagueId: "wnba",
        gameId: "401857083",
        awayScore: 109,
        homeScore: 83,
        gameStatus: "STATUS_FINAL",
        gamePhase: "final",
        gameClock: "Final",
      },
    ]);

    assert.equal(merged[0]?.status, "final");
    assert.equal(merged[0]?.awayScore, 109);
    assert.equal(merged[0]?.homeScore, 83);
    assert.equal(merged[0]?.gameClock, "Final");
  });
});
