import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  finalizeNflVerifiedArtifacts,
  groupGamesBySeason,
  writeNflSeasonShards,
} from "./write-season-shards";

const tempDirs: string[] = [];

function makeTempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nfl-shards-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const sampleGame = (overrides: Partial<{
  gameId: string;
  date: string;
  season: string;
}> = {}) => ({
  gameId: overrides.gameId ?? "g1",
  date: overrides.date ?? "2024-09-08",
  season: overrides.season ?? "2024-25",
  league: "NFL" as const,
  homeTeam: "KC",
  awayTeam: "BAL",
  homeScore: 27,
  awayScore: 20,
  totalPoints: 47,
  totalFouls: 12,
  homeFlags: 6,
  awayFlags: 6,
  homePenaltyYards: 55,
  awayPenaltyYards: 48,
  closingTotal: 46.5,
  homeSpread: -3,
  lineSource: "external" as const,
  officials: [{ name: "Shawn Hochuli", number: 83, role: "referee" as const }],
});

describe("writeNflSeasonShards", () => {
  it("groups games by season and writes ndjson shards", () => {
    const root = makeTempRoot();
    const games = [
      sampleGame({ gameId: "a", season: "2023-24", date: "2023-09-10" }),
      sampleGame({ gameId: "b", season: "2024-25", date: "2024-09-08" }),
      sampleGame({ gameId: "c", season: "2024-25", date: "2024-09-15" }),
    ];

    const grouped = groupGamesBySeason(games);
    assert.equal(grouped.size, 2);
    assert.equal(grouped.get("2024-25")?.length, 2);

    const result = writeNflSeasonShards(games, root);
    assert.equal(result.shardCount, 2);
    assert.equal(result.gameCount, 3);

    const shard2425 = path.join(root, "data/nfl/game-logs/2024-25.ndjson");
    assert.ok(fs.existsSync(shard2425));
    const lines = fs.readFileSync(shard2425, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).gameId, "b");
  });

  it("writes manifest with data_verified", () => {
    const root = makeTempRoot();
    const games = [sampleGame()];
    const { manifest } = finalizeNflVerifiedArtifacts(games, root);
    assert.equal(manifest.data_verified, true);
    assert.equal(manifest.game_count, 1);
    assert.ok(fs.existsSync(path.join(root, "data/nfl/manifest.json")));
  });
});
