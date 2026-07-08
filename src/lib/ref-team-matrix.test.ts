import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "@/lib/leagues";
import { DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import {
  bottomRefsBelowBaselineForTeam,
  computeRefTeamMatrix,
  matrixWhistleDiffShortLabel,
  TEAM_MATRIX_REF_PANEL_LIMIT,
  topRefsBeatingBaselineForTeam,
} from "@/lib/ref-team-matrix";
import { getTeamSplits } from "@/lib/data";
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
    3,
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
});
