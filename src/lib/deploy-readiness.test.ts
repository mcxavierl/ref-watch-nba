import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRODUCTION_LIVE_HEADER_LEAGUE_IDS } from "@/lib/live-header-leagues.generated";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import { getRefStats as getEplRefStats, getTeamSplits as getEplTeamSplits } from "@/lib/epl/data";
import { getRefStats as getNhlRefStats, getTeamSplits as getNhlTeamSplits } from "@/lib/nhl/data";
import { getRefStats as getNflRefStats, getTeamSplits as getNflTeamSplits } from "@/lib/nfl/data";
import {
  bottomRefsBelowBaselineForTeam,
  computeRefTeamMatrix,
  MATRIX_MIN_GAMES,
  resolveMatrixTeamSplits,
  topRefsBeatingBaselineForTeam,
  TEAM_MATRIX_REF_PANEL_LIMIT,
} from "@/lib/ref-team-matrix";
import {
  attachTeamSplits,
  getCachedRefStats,
  mergeCachedLeagueRefStats,
  setCachedRefStats,
  setCachedTeamSplits,
} from "@/lib/ref-stats-preload";
import { loadSplitRefStatsFixture } from "@/lib/test-fixtures/split-ref-stats-fixture";

function clearLeagueCaches(): void {
  globalThis.__REFWATCH_NBA_REF_STATS__ = undefined;
  globalThis.__REFWATCH_NBA_TEAM_SPLITS__ = undefined;
  globalThis.__REFWATCH_NHL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_NHL_TEAM_SPLITS__ = undefined;
  globalThis.__REFWATCH_NFL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_NFL_TEAM_SPLITS__ = undefined;
  globalThis.__REFWATCH_EPL_REF_STATS__ = undefined;
  globalThis.__REFWATCH_EPL_TEAM_SPLITS__ = undefined;
}

describe("deploy readiness regressions", () => {
  it("live header lists every verified production league", () => {
    for (const league of VERIFIED_LIVE_LEAGUE_IDS) {
      assert.ok(
        (PRODUCTION_LIVE_HEADER_LEAGUE_IDS as readonly string[]).includes(league),
        `missing ${league} from PRODUCTION_LIVE_HEADER_LEAGUE_IDS`,
      );
    }
  });

  it("hydrates EPL matrix baselines from sidecar team-splits when core embeds empty arrays", () => {
    const { core, teamSplits: sidecar } = loadSplitRefStatsFixture("epl");
    const ref = core.refs.find(
      (r) => r.teamStats?.ARS && r.teamStats.ARS.games >= MATRIX_MIN_GAMES,
    );
    assert.ok(ref, "fixture needs ARS ref×team cell");

    const slim = attachTeamSplits(
      "epl",
      { ...core, teamSplits: { ARS: [] }, refs: [ref] },
      sidecar,
    );
    const splits = resolveMatrixTeamSplits(slim, "ARS", getEplTeamSplits);
    assert.ok(splits.length > 0);

    const matrix = computeRefTeamMatrix(
      slim,
      [{ abbr: "ARS", label: "Arsenal", name: "Arsenal" }],
      getEplTeamSplits,
      MATRIX_MIN_GAMES,
      { league: "epl" },
    );
    assert.ok(matrix.teams[0]!.baselineGames > 0);
  });

  it("NHL/WPG and NFL/KC matrix panels have top and bottom refs with real baselines", () => {
    clearLeagueCaches();
    for (const [league, stats, getTeamSplits, abbr, label] of [
      ["nhl", getNhlRefStats(), getNhlTeamSplits, "WPG", "WPG"],
      ["nfl", getNflRefStats(), getNflTeamSplits, "KC", "KC"],
      ["epl", getEplRefStats(), getEplTeamSplits, "ARS", "ARS"],
    ] as const) {
      const matrix = computeRefTeamMatrix(
        stats,
        [{ abbr, label, name: label }],
        getTeamSplits,
        MATRIX_MIN_GAMES,
        { league },
      );
      const team = matrix.teams[0]!;
      assert.ok(team.baselineGames > 0, `${league} ${abbr} baseline games`);

      const top = topRefsBeatingBaselineForTeam(
        matrix,
        abbr,
        TEAM_MATRIX_REF_PANEL_LIMIT,
      );
      const bottom = bottomRefsBelowBaselineForTeam(
        matrix,
        abbr,
        TEAM_MATRIX_REF_PANEL_LIMIT,
      );
      assert.ok(top.length > 0, `${league} ${abbr} top panel`);
      assert.ok(bottom.length > 0, `${league} ${abbr} bottom panel`);

      const topSlugs = new Set(top.map((e) => e.refSlug));
      assert.equal(
        bottom.filter((e) => topSlugs.has(e.refSlug)).length,
        0,
        `${league} ${abbr} top/bottom overlap`,
      );
    }
  });

  it("mergeCachedLeagueRefStats patches slim core in ref-stats cache", () => {
    clearLeagueCaches();

    const { core, teamSplits: splits } = loadSplitRefStatsFixture("nhl");
    core.teamSplits = {};

    setCachedRefStats("nhl", core);
    assert.equal(Object.keys(getCachedRefStats("nhl")!.teamSplits).length, 0);

    setCachedTeamSplits("nhl", splits);
    assert.ok(Object.keys(getCachedRefStats("nhl")!.teamSplits).length > 0);

    core.teamSplits = {};
    setCachedRefStats("nhl", core);
    mergeCachedLeagueRefStats("nhl");
    assert.ok(Object.keys(getCachedRefStats("nhl")!.teamSplits).length > 0);
  });
});
