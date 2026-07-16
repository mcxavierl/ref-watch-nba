import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  rebuildNbaRefStatsFromLogs,
  syncNbaRefStatsFromLogs,
} from "./fix-nba-ref-game-counts";
import { syncRefGameCountsFromLogs } from "./fix-ref-game-counts";
import { syncRefStatsFromLogs } from "./sync-ref-stats-from-logs";
import type { RefStatsFile } from "./lib/types";

const ROOT = process.cwd();

function stripVolatileMeta(stats: RefStatsFile): RefStatsFile {
  return {
    ...stats,
    meta: {
      ...stats.meta,
      lastUpdated: "fixed",
    },
  };
}

describe("sync-ref-stats-from-logs", () => {
  it("exports orchestrator and league sync helpers", () => {
    assert.equal(typeof syncRefStatsFromLogs, "function");
    assert.equal(typeof syncNbaRefStatsFromLogs, "function");
    assert.equal(typeof syncRefGameCountsFromLogs, "function");
    assert.equal(typeof rebuildNbaRefStatsFromLogs, "function");
  });

  it("NBA rebuild produces expected ref-stats structure", () => {
    const statsPath = path.join(ROOT, "data/ref-stats.json");
    const existing = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    const rebuilt = rebuildNbaRefStatsFromLogs(existing, ROOT);

    assert.ok(Array.isArray(rebuilt.refs));
    assert.ok(rebuilt.refs.length > 0);
    assert.equal(rebuilt.meta.refCount, rebuilt.refs.length);
    assert.ok((rebuilt.meta.totalGamesProcessed ?? 0) > 0);
    for (const ref of rebuilt.refs) {
      assert.ok(ref.slug);
      assert.ok(ref.games > 0);
      assert.ok(ref.teamStats);
    }
  });

  it("NBA rebuild backfills avgFoulDifferential from team splits", () => {
    const statsPath = path.join(ROOT, "data/ref-stats.json");
    const existing = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    const rebuilt = rebuildNbaRefStatsFromLogs(existing, ROOT);
    const withFoulDiff = rebuilt.refs.flatMap((ref) =>
      Object.values(ref.teamStats ?? {}).filter(
        (stat) => stat.avgFoulDifferential !== 0,
      ),
    );
    assert.ok(
      withFoulDiff.length > 0,
      "expected rebuilt ref teamStats with non-zero avgFoulDifferential",
    );
  });

  it("NBA rebuild is idempotent on refs payload", () => {
    const statsPath = path.join(ROOT, "data/ref-stats.json");
    const existing = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    const once = stripVolatileMeta(rebuildNbaRefStatsFromLogs(existing, ROOT));
    const twice = stripVolatileMeta(rebuildNbaRefStatsFromLogs(once, ROOT));

    assert.deepEqual(
      once.refs.map((ref) => ({
        slug: ref.slug,
        games: ref.games,
        teamStats: ref.teamStats,
      })),
      twice.refs.map((ref) => ({
        slug: ref.slug,
        games: ref.games,
        teamStats: ref.teamStats,
      })),
    );
  });
});
