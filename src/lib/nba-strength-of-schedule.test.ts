import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeStrengthOfSchedule,
  log5WinProbability,
  opponentTiersForSeason,
  seasonEndWinRate,
} from "@/lib/nba-strength-of-schedule";
import { getOfficialSeasonRecord } from "@/lib/nba-team-season-records";
import { DEFAULT_SINCE_SEASON, NBA_TEN_SEASONS } from "@/lib/league-seasons";
import { computeTeamRecordFromGameLogs } from "@/lib/team-record-query";
import gameLogs from "../../data/game-logs.json" with { type: "json" };

const games = gameLogs.games as import("@/lib/team-record-query").TeamGameLogRow[];

describe("log5", () => {
  it(".500 team vs .600 opponent wins ~40% of matchups", () => {
    const p = log5WinProbability(0.5, 0.6);
    assert.ok(Math.abs(p - 0.4) < 0.001);
  });
});

describe("OKC 2023-24 SOS fixture (verifiable season)", () => {
  const season = "2023-24";
  const options = { sinceSeason: season, seasons: [season] };

  it("official record is 57-25", () => {
    assert.deepEqual(getOfficialSeasonRecord("OKC", season), {
      wins: 57,
      losses: 25,
    });
  });

  it("game-log record matches official 57-25", () => {
    const record = computeTeamRecordFromGameLogs(games, "OKC", options);
    assert.equal(record.wins, 57);
    assert.equal(record.losses, 25);
    assert.equal(record.games, 82);
  });

  it("SOS metrics are stable for 2023-24", () => {
    const sos = computeStrengthOfSchedule(games, "OKC", options);
    assert.ok(sos);
    assert.equal(sos!.wins, 57);
    assert.equal(sos!.losses, 25);
    assert.equal(sos!.games, 82);
    // Weighted opponent win% for OKC's 2023-24 schedule (BBR standings).
    assert.ok(sos!.avgOpponentWinPct > 0.48 && sos!.avgOpponentWinPct < 0.54);
    assert.ok(sos!.expectedWins > 38 && sos!.expectedWins < 48);
    assert.ok(sos!.winsAboveExpected > 8 && sos!.winsAboveExpected < 20);
    const top = sos!.splits.top10.games;
    const mid = sos!.splits.mid10.games;
    const bot = sos!.splits.bottom10.games;
    assert.equal(top + mid + bot, 82);
  });

  it("2023-24 tiers place BOS in top10 and DET in bottom10", () => {
    const tiers = opponentTiersForSeason(season);
    assert.equal(tiers.BOS, "top10");
    assert.equal(tiers.DET, "bottom10");
    assert.equal(seasonEndWinRate("BOS", season), 64 / 82);
  });
});

describe("OKC full sample (2016-17 through 2025-26)", () => {
  it("cumulative record is 463-357", () => {
    const seasons = [...NBA_TEN_SEASONS];
    const sos = computeStrengthOfSchedule(games, "OKC", {
      sinceSeason: DEFAULT_SINCE_SEASON,
      seasons,
    });
    assert.ok(sos);
    assert.equal(sos!.wins, 463);
    assert.equal(sos!.losses, 357);
    assert.equal(sos!.games, 820);
    const pct = Math.round(sos!.winRate * 1000) / 10;
    assert.equal(pct, 56.5);
  });
});
