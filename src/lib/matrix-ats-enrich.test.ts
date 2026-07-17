import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { enrichRefStatsForMatrixAts } from "@/lib/matrix-ats-enrich";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import { loadScopedLeagueStats } from "@/lib/load-league-stats";
import type { RefStatsFile } from "@/lib/types";

describe("enrichRefStatsForMatrixAts", () => {
  it("populates team ATS baselines from synthetic lines when league ATS is available", () => {
    const logs = JSON.parse(
      readFileSync("data/nhl/game-logs.json", "utf8"),
    ) as { games: unknown[] };
    setCachedGameLogs("NHL", logs as never);

    const { stats, scopedSeasons } = loadScopedLeagueStats("nhl", "last10");
    assert.equal(stats.meta.atsAvailable, true);

    const enriched = enrichRefStatsForMatrixAts("nhl", stats, scopedSeasons);
    const baselines = enriched.teamAtsBaselines ?? {};
    const teamsWithAts = Object.values(baselines).filter(
      (record) => record.atsGames > 0,
    );

    assert.ok(
      teamsWithAts.length >= 30,
      `expected NHL team ATS baselines, got ${teamsWithAts.length}`,
    );
  });

  it("skips ATS enrichment when league meta marks ATS unavailable", () => {
    const logs = JSON.parse(
      readFileSync("data/nhl/game-logs.json", "utf8"),
    ) as { games: unknown[] };
    setCachedGameLogs("NHL", logs as never);

    const { stats, scopedSeasons } = loadScopedLeagueStats("nhl", "last10");
    const withoutAts: RefStatsFile = {
      ...stats,
      meta: { ...stats.meta, atsAvailable: false },
    };

    const enriched = enrichRefStatsForMatrixAts(
      "nhl",
      withoutAts,
      scopedSeasons,
    );
    assert.equal(enriched.teamAtsBaselines, undefined);
  });
});
