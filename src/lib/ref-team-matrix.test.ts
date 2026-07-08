import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bottomRefsBelowBaselineForTeam,
  computeRefTeamMatrix,
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
    { league: "nba", sinceSeason: "2021-22" },
  );
}

describe("ref-team matrix team panels", () => {
  it("caps top refs at TEAM_MATRIX_REF_PANEL_LIMIT", () => {
    const matrix = buildMatrix();
    const top = topRefsBeatingBaselineForTeam(matrix, "LAL");
    assert.ok(top.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < top.length; i++) {
      assert.ok(top[i - 1]!.deltaPts >= top[i]!.deltaPts);
      assert.ok(top[i]!.deltaPts > 0);
    }
  });

  it("returns bottom refs below baseline, worst first", () => {
    const matrix = buildMatrix();
    const bottom = bottomRefsBelowBaselineForTeam(matrix, "LAL");
    assert.ok(bottom.length <= TEAM_MATRIX_REF_PANEL_LIMIT);
    for (let i = 1; i < bottom.length; i++) {
      assert.ok(bottom[i - 1]!.deltaPts <= bottom[i]!.deltaPts);
      assert.ok(bottom[i]!.deltaPts < 0);
    }
  });
});
