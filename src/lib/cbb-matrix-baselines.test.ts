import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getRefStats, getTeamSplits } from "@/lib/cbb/data";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { matrixTeamMetricRecord } from "@/lib/ref-team-matrix";
import { attachTeamSplits, setCachedRefStats, setCachedTeamSplits } from "@/lib/ref-stats-preload";
import { getTeamDisplayRecord } from "@/lib/teamDisplayRecord";
import { formatTeamSampleRecord } from "@/lib/teamRecord";
import { splitRefStatsForDeploy } from "../../scripts/lib/split-ref-stats";
import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
} from "@/lib/worker-isolate-store";
import { cbbTeamsInDisplayOrder, teamFullName } from "@/lib/cbb/teams";

function clearCaches(): void {
  endWorkerIsolateRequest();
  beginWorkerIsolateRequest();
}

function assertTeamMatrixBaseline(abbr: string): void {
  clearCaches();
  const stats = getRefStats();
  const matrix = computeRefTeamMatrix(
    stats,
    cbbTeamsInDisplayOrder().map((team) => ({
      abbr: team.abbr,
      label: teamFullName(team),
      name: team.name,
    })),
    getTeamSplits,
    undefined,
    { league: "cbb", sinceSeason: "2021-22" },
  );
  const team = matrix.teams.find((entry) => entry.abbr === abbr);
  assert.ok(team, `${abbr} column exists`);
  assert.ok(team!.baselineGames > 0, `${abbr} baseline games: ${team!.baselineGames}`);
  assert.notEqual(matrixTeamMetricRecord(team!, "wl"), "n/a");
}

describe("CBB matrix team baselines", () => {
  it("GTWN has a real matrix baseline from local data", () => {
    assertTeamMatrixBaseline("GTWN");
  });

  it("GONZ has a real matrix baseline from local data", () => {
    assertTeamMatrixBaseline("GONZ");
  });

  it("GTWN baseline survives slim core + sidecar team-splits (production shape)", () => {
    clearCaches();
    const full = JSON.parse(
      readFileSync("data/cbb/ref-stats.json", "utf8"),
    ) as ReturnType<typeof getRefStats>;
    const { core, teamSplits } = splitRefStatsForDeploy(full);
    assert.equal(core.teamSplits?.GTWN?.length ?? 0, 0, "core should strip embedded splits");

    setCachedRefStats("cbb", { ...core, teamSplits: {} });
    setCachedTeamSplits("cbb", teamSplits);

    const stats = attachTeamSplits("cbb", getRefStats(), {});
    const splits = stats.teamSplits.GTWN ?? [];
    assert.ok(splits.length > 0, "sidecar GTWN splits hydrate");

    const record = getTeamDisplayRecord(
      "cbb",
      "GTWN",
      splits,
      stats.meta.seasons,
      { sinceSeason: "2021-22" },
    );
    assert.ok(record.games > 0, "GTWN display record from sidecar");
    assert.notEqual(formatTeamSampleRecord(record), "n/a");
  });
});
