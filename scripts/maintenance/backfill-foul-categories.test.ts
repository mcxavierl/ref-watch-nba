import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { FoulCategory } from "../../src/lib/types/foul-categories";
import {
  backfillFoulRecord,
  backfillGameLogRow,
  backfillGameLogShard,
  discoverGameLogShards,
  leagueFromShardPath,
  runFoulCategoryBackfill,
} from "./lib/backfill-foul-categories";

const tempDirs: string[] = [];

function makeTempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foul-backfill-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("backfill-foul-categories", () => {
  it("preserves existing category tags", () => {
    const result = backfillFoulRecord("nfl", {
      rawType: "Delay of Game",
      category: FoulCategory.SUBJECTIVE,
    });
    assert.equal(result.tagged, false);
    assert.equal(result.foul.category, FoulCategory.SUBJECTIVE);
  });

  it("tags missing categories using FOUL_CLASSIFICATION_MAP", () => {
    const result = backfillFoulRecord("nfl", {
      rawType: "False Start",
      team: "KC",
    });
    assert.equal(result.tagged, true);
    assert.equal(result.foul.category, FoulCategory.ADMIN);
  });

  it("backfills nested penaltyEvents and fouls on one game row", () => {
    const { game, modified, foulEntriesTagged } = backfillGameLogRow("nba", {
      gameId: "g1",
      fouls: [
        { foulName: "Delay of Game" },
        { foulName: "Shooting Foul", category: FoulCategory.SUBJECTIVE },
      ],
      penaltyEvents: [{ rawType: "Defensive Holding" }],
    });

    assert.equal(modified, true);
    assert.equal(foulEntriesTagged, 2);
    assert.equal(game.fouls?.[0]?.category, FoulCategory.ADMIN);
    assert.equal(game.fouls?.[1]?.category, FoulCategory.SUBJECTIVE);
    assert.equal(game.penaltyEvents?.[0]?.category, FoulCategory.SUBJECTIVE);
  });

  it("dry-run leaves shard bytes unchanged", () => {
    const root = makeTempRoot();
    const shardDir = path.join(root, "data", "nfl", "game-logs");
    fs.mkdirSync(shardDir, { recursive: true });
    const shardPath = path.join(shardDir, "2024-25.ndjson");
    const original =
      `${JSON.stringify({
        gameId: "g1",
        penaltyEvents: [{ rawType: "Delay of Game", team: "KC" }],
      })}\n`;
    fs.writeFileSync(shardPath, original, "utf8");

    const stats = backfillGameLogShard({ shardPath, root, dryRun: true });
    assert.equal(stats.gamesModified, 1);
    assert.equal(stats.foulEntriesTagged, 1);
    assert.equal(fs.readFileSync(shardPath, "utf8"), original);
  });

  it("write mode updates only rows missing categories", () => {
    const root = makeTempRoot();
    const shardDir = path.join(root, "data", "nba", "game-logs");
    fs.mkdirSync(shardDir, { recursive: true });
    const shardPath = path.join(shardDir, "2024-25.ndjson");
    const alreadyTagged = JSON.stringify({
      gameId: "g2",
      fouls: [{ foulName: "Shooting Foul", category: FoulCategory.SUBJECTIVE }],
    });
    const needsTag = JSON.stringify({
      gameId: "g1",
      fouls: [{ foulName: "Delay of Game" }],
    });
    fs.writeFileSync(shardPath, `${needsTag}\n${alreadyTagged}\n`, "utf8");

    const stats = backfillGameLogShard({ shardPath, root, dryRun: false });
    assert.equal(stats.gamesModified, 1);
    const lines = fs.readFileSync(shardPath, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).fouls[0].category, FoulCategory.ADMIN);
    assert.equal(lines[1], alreadyTagged);
  });

  it("discovers all league game-log shards", () => {
    const root = makeTempRoot();
    for (const league of ["nba", "nfl", "nhl"]) {
      const dir = path.join(root, "data", league, "game-logs");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "2024-25.ndjson"), "{}\n", "utf8");
    }

    const shards = discoverGameLogShards(root);
    assert.equal(shards.length, 3);
    assert.equal(leagueFromShardPath(shards.find((p) => p.includes("/nba/"))!, root), "nba");
    assert.equal(leagueFromShardPath(shards.find((p) => p.includes("/nfl/"))!, root), "nfl");
    assert.equal(leagueFromShardPath(shards.find((p) => p.includes("/nhl/"))!, root), null);
  });

  it("runFoulCategoryBackfill supports single-file dry runs", () => {
    const root = makeTempRoot();
    const shardDir = path.join(root, "data", "nfl", "game-logs");
    fs.mkdirSync(shardDir, { recursive: true });
    const shardPath = path.join(shardDir, "2024-25.ndjson");
    fs.writeFileSync(
      shardPath,
      `${JSON.stringify({
        gameId: "g1",
        penaltyEvents: [{ rawType: "Illegal Formation" }],
      })}\n`,
      "utf8",
    );

    const report = runFoulCategoryBackfill({
      root,
      shardPaths: [shardPath],
      dryRun: true,
    });

    assert.equal(report.dryRun, true);
    assert.equal(report.totals.foulEntriesTagged, 1);
    assert.equal(report.totals.gamesModified, 1);
  });
});
