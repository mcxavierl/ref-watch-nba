import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHardTruthSeason,
  resolveRefProfileFoulCategory,
} from "@/lib/analytics/resolve-ref-profile-foul-category";
import {
  BACKFILL_MIN_SAMPLE_GAMES,
  buildSeasonOfficialStatsEntry,
  calendarYearToSeasonLabel,
  calculatedWhistleTotalsForSeason,
  databaseWhistleTotalsForSeason,
  verifyFoulIntegrity,
} from "../../scripts/lib/backfill-elite-metrics";
import type { GameLogEntry } from "../../scripts/lib/game-logs";
import type { RefProfile } from "@/lib/types";

function makeGame(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return {
    gameId: "g1",
    date: "2023-10-24",
    season: "2023-24",
    league: "NBA",
    homeTeam: "LAL",
    awayTeam: "BOS",
    homeScore: 110,
    awayScore: 105,
    totalPoints: 215,
    totalFouls: 40,
    closingTotal: 220,
    homeSpread: -3,
    lineSource: "external",
    officials: [{ name: "Test Ref", number: 1, role: "referee" }],
    ...overrides,
  };
}

describe("ref intelligence backfill", () => {
  describe("resolveRefProfileFoulCategory", () => {
    it("treats 2023-2026 seasons as hard truth when direct categories exist", () => {
      const result = resolveRefProfileFoulCategory(
        "nba",
        { totalFouls: 40, subjectiveFlags: 30, administrativeFlags: 10 },
        "2024-25",
      );
      assert.equal(result.source, "direct");
      assert.equal(result.subjective, 30);
      assert.equal(result.administrative, 10);
      assert.equal(isHardTruthSeason("2024-25"), true);
    });

    it("resolves missing categories for 2021-2022 seasons", () => {
      const result = resolveRefProfileFoulCategory(
        "nba",
        { totalFouls: 40 },
        "2021-22",
      );
      assert.equal(result.source, "resolved");
      assert.ok(result.subjective > 0);
      assert.ok(result.administrative >= 0);
      assert.equal(isHardTruthSeason("2021-22"), false);
    });
  });

  describe("backfill elite metrics helpers", () => {
    it("maps calendar years to season labels", () => {
      assert.equal(calendarYearToSeasonLabel(2021), "2021-22");
      assert.equal(calendarYearToSeasonLabel(2026), "2026-27");
    });

    it("verifies foul integrity with exact totals and game counts", () => {
      assert.equal(verifyFoulIntegrity(400, 400, 10, 10).ok, true);
      assert.equal(verifyFoulIntegrity(400, 390, 10, 10).ok, false);
      assert.equal(verifyFoulIntegrity(400, 400, 10, 9).ok, false);
    });

    it("marks seasons with fewer than 10 games as INSUFFICIENT_DATA", () => {
      const games = Array.from({ length: BACKFILL_MIN_SAMPLE_GAMES - 1 }, () => makeGame());
      const entry = buildSeasonOfficialStatsEntry(
        "nba",
        "2023-24",
        games,
        "2026-07-20T00:00:00.000Z",
      );
      assert.ok(entry);
      assert.equal(entry!.status, "INSUFFICIENT_DATA");
    });

    it("computes database whistle totals from recentGames for a season", () => {
      const profile = {
        slug: "test-ref-1",
        name: "Test Ref",
        number: 1,
        games: 2,
        avgTotalPoints: 220,
        overRate: 0.5,
        avgFouls: 40,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2023-24"],
        recentGames: [
          {
            gameId: "g1",
            date: "2023-10-24",
            season: "2023-24",
            homeTeam: "LAL",
            awayTeam: "BOS",
            totalPoints: 215,
            totalFouls: 40,
            overHit: true,
            raptorsInvolved: false,
          },
          {
            gameId: "g2",
            date: "2023-10-26",
            season: "2023-24",
            homeTeam: "NYK",
            awayTeam: "MIA",
            totalPoints: 210,
            totalFouls: 38,
            overHit: false,
            raptorsInvolved: false,
          },
        ],
      } satisfies Partial<RefProfile> as RefProfile;

      const totals = databaseWhistleTotalsForSeason("nba", profile, "2023-24");
      assert.equal(totals.games, 2);
      assert.equal(totals.fouls, 78);

      const games = [
        makeGame({ gameId: "g1", totalFouls: 40 }),
        makeGame({ gameId: "g2", totalFouls: 38 }),
      ];
      const calculated = calculatedWhistleTotalsForSeason("nba", games);
      assert.equal(calculated.fouls, 78);
      assert.equal(calculated.games, 2);
    });
  });
});
