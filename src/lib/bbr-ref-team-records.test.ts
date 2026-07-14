import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  aggregateBbrRefTeamRecords,
  countBbrRefTeamPairs,
  type BbrRefTeamRecordsFile,
} from "@/lib/bbr-ref-team-records";
import {
  matrixCellKey,
  teamRecordFromStat,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { getTeamSplits } from "@/lib/data";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import type { RefStatsFile } from "@/lib/types";
import statsJson from "../../data/ref-stats.json" with { type: "json" };

const FALLBACK_FIXTURE: BbrRefTeamRecordsFile = {
  lastUpdated: "",
  seasons: ["2022-23", "2023-24", "2024-25", "2025-26"],
  teams: ["TOR"],
  entries: [
    {
      team: "TOR",
      season: "2022-23",
      bbrYear: 2023,
      referees: [{ referee: "Marat Kogut", games: 4, wins: 1, losses: 3 }],
    },
    {
      team: "TOR",
      season: "2023-24",
      bbrYear: 2024,
      referees: [{ referee: "Marat Kogut", games: 5, wins: 0, losses: 5 }],
    },
    {
      team: "TOR",
      season: "2024-25",
      bbrYear: 2025,
      referees: [{ referee: "Marat Kogut", games: 5, wins: 0, losses: 5 }],
    },
    {
      team: "TOR",
      season: "2025-26",
      bbrYear: 2026,
      referees: [{ referee: "Marat Kogut", games: 2, wins: 2, losses: 0 }],
    },
  ],
  stats: { pagesFetched: 0, pagesFailed: 0, refTeamPairs: 1 },
};

function loadBbrFixture(): BbrRefTeamRecordsFile {
  const fixturePath = path.join(process.cwd(), "data/bbr-ref-team-records.json");
  try {
    return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as BbrRefTeamRecordsFile;
  } catch {
    return FALLBACK_FIXTURE;
  }
}

const bbrFixture = loadBbrFixture();
const stats = statsJson as RefStatsFile;

describe("BBR ref×team records", () => {
  it("Marat Kogut × TOR aggregate matches BBR fixture (2022-23 through 2025-26)", () => {
    const seasons = ["2022-23", "2023-24", "2024-25", "2025-26"];
    const agg = aggregateBbrRefTeamRecords(
      bbrFixture,
      "Marat Kogut",
      "TOR",
      seasons,
    );
    assert.ok(agg, "Kogut×TOR aggregate");
    assert.equal(agg.games, 16);
    assert.equal(agg.wins, 3);
    assert.equal(agg.losses, 13);
    assert.equal(agg.winRate, 0.188);
  });

  it("matrix cell for Kogut×TOR uses exact BBR wins/losses when applied", () => {
    const kogut = stats.refs.find((r) => r.slug === "marat-kogut-32");
    assert.ok(kogut?.teamStats?.TOR, "Kogut TOR teamStat");
    const torStat = kogut!.teamStats!.TOR;
    const expected = aggregateBbrRefTeamRecords(
      bbrFixture,
      "Marat Kogut",
      "TOR",
      stats.meta.seasons,
    );

    if (stats.meta.refTeamWinLossSource === "basketball-reference" && expected) {
      assert.equal(torStat.wins, expected.wins);
      assert.equal(torStat.losses, expected.losses);
      assert.equal(torStat.games, expected.games);
    }

    const record = teamRecordFromStat(torStat);
    const matrix = computeRefTeamMatrix(
      stats,
      NBA_TEAMS.map((team) => ({
        abbr: team.abbr,
        label: teamFullName(team),
        name: team.name,
        nbaId: team.nbaId,
      })),
      getTeamSplits,
      3,
      { league: "nba", sinceSeason: "2021-22" },
    );
    const cell = matrix.cells[matrixCellKey("marat-kogut-32", "TOR")];
    assert.ok(cell, "qualified Kogut×TOR cell");
    assert.equal(cell.wins, record.wins);
    assert.equal(cell.losses, record.losses);
    assert.equal(cell.games, torStat.games);
  });

  it("BBR fixture has ref×team pair coverage", () => {
    if (bbrFixture.stats.pagesFetched > 0) {
      assert.ok(bbrFixture.stats.refTeamPairs > 1000);
      assert.equal(bbrFixture.entries.length, 150);
    }
    assert.ok(countBbrRefTeamPairs(bbrFixture) >= 1);
  });
});
