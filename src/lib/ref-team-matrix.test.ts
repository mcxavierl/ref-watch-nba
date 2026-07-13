import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "@/lib/leagues";
import { DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import {
  bottomRefsBelowBaselineForTeam,
  computeRefTeamMatrix,
  MATRIX_MIN_GAMES,
  matrixCellStyle,
  matrixWhistleDiffShortLabel,
  refMatrixQualifiedGames,
  refMatrixStandoutCount,
  sortMatrixRefs,
  teamRecordFromStat,
  TEAM_MATRIX_REF_PANEL_LIMIT,
  topRefsBeatingBaselineForTeam,
} from "@/lib/ref-team-matrix";
import { getTeamSplits } from "@/lib/data";
import { loadSplitRefStatsFixture } from "@/lib/test-fixtures/split-ref-stats-fixture";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import type { RefStatsFile } from "@/lib/types";
import statsJson from "../../data/ref-stats.json" with { type: "json" };

const stats = statsJson as RefStatsFile;

function buildMatrix() {
  return computeRefTeamMatrix(
    stats,
    NBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
      nbaId: team.nbaId,
    })),
    getTeamSplits,
    MATRIX_MIN_GAMES,
    { league: "nba", sinceSeason: DEFAULT_SINCE_SEASON },
  );
}

describe("matrixWhistleDiffShortLabel", () => {
  it("uses league whistleShort labels", () => {
    assert.equal(matrixWhistleDiffShortLabel(LEAGUES.nba.metrics), "Fouls diff");
    assert.equal(matrixWhistleDiffShortLabel(LEAGUES.nhl.metrics), "Minors diff");
    assert.equal(matrixWhistleDiffShortLabel(LEAGUES.nfl.metrics), "Flags diff");
    assert.equal(matrixWhistleDiffShortLabel(LEAGUES.epl.metrics), "Fouls diff");
  });
});

describe("ref-team matrix team panels", () => {
  it("caps top refs at TEAM_MATRIX_REF_PANEL_LIMIT by record (default)", () => {
    const matrix = buildMatrix();
    const top = topRefsBeatingBaselineForTeam(matrix, "LAL");
    assert.ok(top.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < top.length; i++) {
      assert.ok(top[i - 1]!.deltaPts >= top[i]!.deltaPts);
    }
  });

  it("returns bottom refs by win-rate delta vs baseline by default", () => {
    const matrix = buildMatrix();
    const bottom = bottomRefsBelowBaselineForTeam(matrix, "LAL");
    assert.ok(bottom.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < bottom.length; i++) {
      assert.ok(bottom[i - 1]!.deltaPts <= bottom[i]!.deltaPts);
    }
    for (const entry of bottom) {
      assert.ok(entry.deltaPts < 0);
    }
  });

  it("only includes refs above baseline in the top panel for record sort", () => {
    const matrix = buildMatrix();
    const top = topRefsBeatingBaselineForTeam(matrix, "LAL");
    for (const entry of top) {
      assert.ok(entry.deltaPts > 0);
    }
  });

  it("sorts top refs by whistle differential when penalty-diff mode is selected", () => {
    const matrix = buildMatrix();
    const top = topRefsBeatingBaselineForTeam(matrix, "LAL", TEAM_MATRIX_REF_PANEL_LIMIT, "penalty-diff");
    assert.ok(top.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < top.length; i++) {
      assert.ok(
        top[i - 1]!.avgFoulDifferential >= top[i]!.avgFoulDifferential,
      );
    }
  });

  it("returns bottom refs by whistle differential when penalty-diff mode is selected", () => {
    const matrix = buildMatrix();
    const bottom = bottomRefsBelowBaselineForTeam(matrix, "LAL", TEAM_MATRIX_REF_PANEL_LIMIT, "penalty-diff");
    assert.ok(bottom.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < bottom.length; i++) {
      assert.ok(
        bottom[i - 1]!.avgFoulDifferential <= bottom[i]!.avgFoulDifferential,
      );
    }
  });

  it("includes win-rate delta as secondary context on panel entries", () => {
    const matrix = buildMatrix();
    const top = topRefsBeatingBaselineForTeam(matrix, "LAL");
    assert.ok(top.length > 0);
    for (const entry of top) {
      assert.equal(typeof entry.deltaPts, "number");
      assert.equal(typeof entry.avgFoulDifferential, "number");
      assert.equal(typeof entry.wins, "number");
      assert.equal(typeof entry.losses, "number");
    }
  });

  it("hydrates non-NBA baselines from getTeamSplits when core strips teamSplits", () => {
    const { core: eplCore, teamSplits: eplTeamSplits } =
      loadSplitRefStatsFixture("epl");

    const refWithArs = eplCore.refs.find(
      (r) => r.teamStats?.ARS && r.teamStats.ARS.games >= MATRIX_MIN_GAMES,
    );
    assert.ok(refWithArs, "fixture needs a ref with ARS games");

    const slimStats: RefStatsFile = {
      ...eplCore,
      teamSplits: { ARS: [] },
      refs: [refWithArs],
    };
    const getEplTeamSplits = (abbr: string) =>
      eplTeamSplits[abbr.toUpperCase()] ?? [];

    const matrix = computeRefTeamMatrix(
      slimStats,
      [{ abbr: "ARS", label: "Arsenal", name: "Arsenal" }],
      getEplTeamSplits,
      MATRIX_MIN_GAMES,
      { league: "epl" },
    );

    assert.ok(matrix.teams[0]!.baselineWinRate > 0);
    assert.ok(matrix.teams[0]!.baselineGames > 0);
    const bottom = bottomRefsBelowBaselineForTeam(matrix, "ARS");
    assert.ok(bottom.length > 0);
  });

  it("falls back to audited NBA seasons when meta.seasons is empty", () => {
    const emptySeasons = {
      ...stats,
      meta: { ...stats.meta, seasons: [] },
    } as RefStatsFile;
    const matrix = computeRefTeamMatrix(
      emptySeasons,
      [{ abbr: "BOS", label: "Boston Celtics", name: "Celtics" }],
      getTeamSplits,
      MATRIX_MIN_GAMES,
      { league: "nba", sinceSeason: DEFAULT_SINCE_SEASON },
    );
    const team = matrix.teams[0]!;
    assert.ok(team.baselineGames > 0, "BOS baseline games");
    assert.equal(team.baselineWins, 488);
    assert.equal(team.baselineLosses, 332);
  });

  it("uses neutral tone when team baseline is unavailable", () => {
    const style = matrixCellStyle(
      {
        refSlug: "ref-a",
        teamAbbr: "BOS",
        games: 12,
        wins: 6,
        losses: 6,
        winRate: 0.5,
        avgFoulDifferential: 0,
      },
      0,
      0,
    );
    assert.equal(style.tone, "neutral");
    assert.equal(style.extreme, null);
    assert.equal(style.deltaPts, 0);
  });
});

describe("sortMatrixRefs", () => {
  it("ranks refs with qualified samples above thin-only rows by default", () => {
    const matrix = buildMatrix();
    const sorted = sortMatrixRefs(matrix.refs, matrix, "standout-desc");
    const firstQualGames = refMatrixQualifiedGames(matrix, sorted[0]!.slug);
    const lastQualGames = refMatrixQualifiedGames(
      matrix,
      sorted[sorted.length - 1]!.slug,
    );
    assert.ok(firstQualGames > 0);
    if (lastQualGames === 0) {
      assert.ok(firstQualGames > lastQualGames);
    }
  });

  it("ignores thin samples in standout count", () => {
    const matrix = {
      refs: [{ slug: "thin-ref", name: "Thin Ref" }],
      teams: [
        {
          abbr: "BOS",
          label: "Boston Celtics",
          name: "Celtics",
          baselineWins: 40,
          baselineLosses: 40,
          baselineGames: 80,
          baselineWinRate: 0.5,
        },
      ],
      cells: {
        "thin-ref|BOS": {
          refSlug: "thin-ref",
          teamAbbr: "BOS",
          games: 3,
          wins: 0,
          losses: 3,
          winRate: 0,
          avgFoulDifferential: 0,
          thinSample: true,
        },
      },
      minGames: MATRIX_MIN_GAMES,
      qualifiedCellCount: 0,
    };
    assert.equal(refMatrixStandoutCount(matrix, "thin-ref"), 0);
    assert.equal(refMatrixQualifiedGames(matrix, "thin-ref"), 0);
  });

  it("breaks standout ties by total qualified games", () => {
    const matrix = buildMatrix();
    const sorted = sortMatrixRefs(matrix.refs, matrix, "standout-desc");
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const prevStandout = refMatrixStandoutCount(matrix, prev.slug);
      const currStandout = refMatrixStandoutCount(matrix, curr.slug);
      if (prevStandout !== currStandout) {
        assert.ok(prevStandout >= currStandout);
        continue;
      }
      const prevGames = refMatrixQualifiedGames(matrix, prev.slug);
      const currGames = refMatrixQualifiedGames(matrix, curr.slug);
      if (prevGames !== currGames) {
        assert.ok(prevGames >= currGames);
      }
    }
  });
});

describe("teamRecordFromStat", () => {
  it("recomputes W-L from winRate when explicit 0-0 disagrees with game count", () => {
    const record = teamRecordFromStat({
      games: 8,
      wins: 0,
      losses: 0,
      winRate: 0.625,
      avgFoulDifferential: 0,
      avgTotalPoints: 45,
      overRate: 0.5,
    });
    assert.equal(record.wins, 5);
    assert.equal(record.losses, 3);
  });
});
