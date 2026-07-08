import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOfficialSeasonRecord,
  NBA_REGULAR_SEASON_RECORDS,
  NBA_TEAM_ORDER,
  sumOfficialRegularSeasonRecord,
} from "@/lib/nba-team-season-records";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix";
import { getOfficialTeamRegularSeasonRecord } from "@/lib/team-record-query";
import type { RefStatsFile } from "@/lib/types";
import statsJson from "../../data/ref-stats.json" with { type: "json" };
import { getTeamSplits } from "@/lib/data";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";

const stats = statsJson as RefStatsFile;

describe("NBA regular-season records fixture", () => {
  it("OKC per-season rows match Basketball-Reference through 2024-25", () => {
    assert.deepEqual(getOfficialSeasonRecord("OKC", "2021-22"), {
      wins: 24,
      losses: 58,
    });
    assert.deepEqual(getOfficialSeasonRecord("OKC", "2022-23"), {
      wins: 40,
      losses: 42,
    });
    assert.deepEqual(getOfficialSeasonRecord("OKC", "2023-24"), {
      wins: 57,
      losses: 25,
    });
    assert.deepEqual(getOfficialSeasonRecord("OKC", "2024-25"), {
      wins: 68,
      losses: 14,
    });
  });

  it("OKC cumulative 2021-22 through 2024-25 is 189-139", () => {
    const seasons = ["2021-22", "2022-23", "2023-24", "2024-25"];
    const total = sumOfficialRegularSeasonRecord("OKC", seasons);
    assert.equal(total.wins, 189);
    assert.equal(total.losses, 139);

    const display = getOfficialTeamRegularSeasonRecord("OKC", seasons, {
      sinceSeason: "2021-22",
    });
    assert.equal(display.wins, 189);
    assert.equal(display.losses, 139);
    assert.equal(display.games, 328);
    assert.equal(Math.round(display.winRate * 1000), 576);
  });

  it("each season sums to 1230 league wins (30 teams × 82 / 2)", () => {
    for (const season of [
      "2021-22",
      "2022-23",
      "2023-24",
      "2024-25",
      "2025-26",
    ]) {
      const total = sumOfficialRegularSeasonRecord("ATL", [season]);
      const leagueWins = Object.values(
        NBA_REGULAR_SEASON_RECORDS[season] ?? {},
      ).reduce((sum, row) => sum + row.wins, 0);
      assert.equal(leagueWins, 1230, `${season} league win total`);
      assert.equal(total.wins + total.losses, 82, `${season} ATL games`);
    }
  });

  it("matrix baselines use official records for every NBA team", () => {
    const seasons = stats.meta.seasons;
    const matrix = computeRefTeamMatrix(
      stats,
      NBA_TEAMS.map((team) => ({
        abbr: team.abbr,
        label: teamFullName(team),
        name: team.name,
        nbaId: team.nbaId,
      })),
      getTeamSplits,
      undefined,
      { league: "nba", sinceSeason: "2021-22" },
    );

    for (const abbr of NBA_TEAM_ORDER) {
      const official = sumOfficialRegularSeasonRecord(abbr, seasons);
      const team = matrix.teams.find((row) => row.abbr.toUpperCase() === abbr);
      assert.ok(team, `${abbr} matrix row`);
      assert.equal(team.baselineWins, official.wins, `${abbr} wins`);
      assert.equal(team.baselineLosses, official.losses, `${abbr} losses`);
    }
  });

  it("BOS official total differs from raw crew-split sum (regression guard)", () => {
    const seasons = stats.meta.seasons;
    const official = getOfficialTeamRegularSeasonRecord("BOS", seasons, {
      sinceSeason: "2021-22",
    });
    assert.equal(official.wins, 247);
    assert.equal(official.losses, 163);
  });
});
