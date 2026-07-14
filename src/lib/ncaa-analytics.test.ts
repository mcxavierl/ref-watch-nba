import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCbbWhistleMatrix } from "@/lib/cbb-whistle-matrix";
import { computeCfbPenaltyEngine } from "@/lib/cfb-penalty-engine";
import {
  computeMetricsBaselines,
  conferenceForGame,
  NCAA_MIN_OUTLIER_GAMES,
} from "@/lib/metrics-computer";
import { isNcaaHighStakesGame } from "@/lib/ncaa-marquee-games";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

const REF_A = { name: "Hot Whistle", number: 11, role: "referee" as const };
const REF_B = { name: "Cool Whistle", number: 12, role: "referee" as const };

function cbbGame(
  index: number,
  home: string,
  away: string,
  totalFouls: number,
  date: string,
): RuntimeGameLogEntry & { homeFouls: number; awayFouls: number } {
  return {
    gameId: `cbb-${index}`,
    date,
    season: "2024-25",
    league: "CBB",
    homeTeam: home,
    awayTeam: away,
    homeScore: 70,
    awayScore: 68,
    totalPoints: 138,
    totalFouls,
    homeFouls: Math.ceil(totalFouls / 2),
    awayFouls: Math.floor(totalFouls / 2),
    closingTotal: 140,
    homeSpread: -2,
    lineSource: "external",
    officials: [REF_A, REF_B, { name: "Third Official", number: 13, role: "referee" }],
  };
}

function cfbGame(
  index: number,
  home: string,
  away: string,
  homeFlags: number,
  awayFlags: number,
): RuntimeGameLogEntry {
  return {
    gameId: `cfb-${index}`,
    date: "2024-11-30",
    season: "2024-25",
    league: "CFB",
    homeTeam: home,
    awayTeam: away,
    homeScore: 24,
    awayScore: 21,
    totalPoints: 45,
    totalFouls: homeFlags + awayFlags,
    homeFlags,
    awayFlags,
    homePenaltyYards: homeFlags * 8,
    awayPenaltyYards: awayFlags * 8,
    closingTotal: 48,
    homeSpread: -3,
    lineSource: "external",
    officials: [REF_A],
    subjectiveFlags: 2,
    penaltyEvents: [
      {
        type: "defensive_holding",
        rawType: "Defensive Holding",
        team: home,
        yards: 5,
        accepted: true,
        leverage: { down: 3, distance: 8, tier: "high" },
        leverageScore: 0.8,
      },
    ],
  };
}

describe("metrics-computer conference baselines", () => {
  it("computes separate SEC and ACC foul baselines", () => {
    const games = [
      cbbGame(1, "ALA", "AUB", 40, "2024-01-10"),
      cbbGame(2, "ALA", "AUB", 44, "2024-01-12"),
      cbbGame(3, "DUKE", "UNC", 28, "2024-01-14"),
      cbbGame(4, "DUKE", "UNC", 30, "2024-01-16"),
    ];
    const baselines = computeMetricsBaselines(games, "cbb");
    assert.ok(baselines.byConference.SEC.avgFouls > baselines.byConference.ACC.avgFouls);
    assert.equal(conferenceForGame(games[0]!, "cbb"), "SEC");
    assert.equal(conferenceForGame(games[2]!, "cbb"), "ACC");
  });
});

describe("ncaa marquee games", () => {
  it("flags Duke-UNC in March as high-stakes rivalry", () => {
    const game = cbbGame(1, "DUKE", "UNC", 32, "2024-03-15");
    assert.equal(isNcaaHighStakesGame(game, "cbb"), true);
  });
});

describe("cbb whistle matrix", () => {
  it("flags crew chief tech-rate outliers only above minimum games gate", () => {
    const games: RuntimeGameLogEntry[] = [];
    for (let i = 0; i < 10; i++) {
      games.push(cbbGame(i, "DUKE", "UNC", 30, "2024-01-10"));
    }
    for (let i = 10; i < NCAA_MIN_OUTLIER_GAMES + 10; i++) {
      games.push(cbbGame(i, "DUKE", "UNC", 52, "2024-03-01"));
    }
    const outliers = computeCbbWhistleMatrix(games, ["2024-25"]);
    assert.ok(outliers.some((row) => row.kind === "crew-chief-tech-rate"));
    for (const row of outliers) {
      assert.ok(row.games >= NCAA_MIN_OUTLIER_GAMES);
      assert.equal(row.sampleGateCleared, true);
    }
  });
});

describe("cfb penalty engine", () => {
  it("detects home penalty suppression with conference context", () => {
    const games: RuntimeGameLogEntry[] = [];
    for (let i = 0; i < NCAA_MIN_OUTLIER_GAMES + 2; i++) {
      games.push(cfbGame(i, "ALA", "AUB", 2, 9));
    }
    const outliers = computeCfbPenaltyEngine(games, ["2024-25"]);
    assert.ok(
      outliers.some((row) => row.kind === "home-penalty-suppression"),
    );
  });

  it("returns empty when no CFB game logs are present", () => {
    assert.deepEqual(computeCfbPenaltyEngine([], ["2024-25"]), []);
  });
});
