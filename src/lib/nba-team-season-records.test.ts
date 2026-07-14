import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOfficialSeasonRecord,
  NBA_REGULAR_SEASON_RECORDS,
  NBA_TEAM_ORDER,
  sumOfficialRegularSeasonRecord,
  DEFAULT_SINCE_SEASON,
} from "@/lib/nba-team-season-records";
import { NBA_TEN_SEASONS } from "@/lib/league-seasons";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { getOfficialTeamRegularSeasonRecord } from "@/lib/team-record-query";
import type { RefStatsFile } from "@/lib/types";
import statsJson from "../../data/ref-stats.json" with { type: "json" };
import { getTeamSplits } from "@/lib/data";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";

const stats = statsJson as RefStatsFile;

function seasonsSince(since: string, pool: string[] = [...NBA_TEN_SEASONS]): string[] {
  return pool.filter((s) => s >= since);
}

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

  it("each audited 82-game season sums to 1230 league wins", () => {
    const fullSeasons = NBA_TEN_SEASONS.filter(
      (s) => s !== "2019-20" && s !== "2020-21" && s !== "2018-19",
    );
    for (const season of fullSeasons) {
      const leagueWins = Object.values(
        NBA_REGULAR_SEASON_RECORDS[season] ?? {},
      ).reduce((sum, row) => sum + row.wins, 0);
      assert.equal(leagueWins, 1230, `${season} league win total`);
      const atl = sumOfficialRegularSeasonRecord("ATL", [season]);
      assert.equal(atl.wins + atl.losses, 82, `${season} ATL games`);
    }
  });

  it("matrix baselines use official records for every NBA team", () => {
    const seasons = seasonsSince(DEFAULT_SINCE_SEASON, stats.meta.seasons);
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
      { league: "nba", sinceSeason: DEFAULT_SINCE_SEASON },
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
    const seasons = seasonsSince(DEFAULT_SINCE_SEASON, stats.meta.seasons);
    const official = getOfficialTeamRegularSeasonRecord("BOS", seasons, {
      sinceSeason: DEFAULT_SINCE_SEASON,
    });
    assert.equal(official.wins, 488);
    assert.equal(official.losses, 332);
  });
});
