import * as fs from "node:fs";
import * as path from "node:path";
import type { NflHistoricalGameLogEntry } from "./nflverse-historical";
import { tagNflPenaltyEvents } from "./ingest-utils";

export const NFL_GAME_LOGS_DIR = "data/nfl/game-logs";
export const NFL_MANIFEST_PATH = "data/nfl/manifest.json";

export type NflGameLogShardEntry = NflHistoricalGameLogEntry;

export type NflIngestManifest = {
  data_verified: boolean;
  data_source: string;
  last_ingested_at: string;
  game_count: number;
  seasons: string[];
  note: string;
};

export function groupGamesBySeason(
  games: NflGameLogShardEntry[],
): Map<string, NflGameLogShardEntry[]> {
  const bySeason = new Map<string, NflGameLogShardEntry[]>();
  for (const game of games) {
    const list = bySeason.get(game.season) ?? [];
    list.push(game);
    bySeason.set(game.season, list);
  }
  return bySeason;
}

function prepareGameForShard(game: NflGameLogShardEntry): NflGameLogShardEntry {
  if (!game.penaltyEvents?.length) return game;
  return {
    ...game,
    penaltyEvents: tagNflPenaltyEvents(game.penaltyEvents),
  };
}

export function writeNflSeasonShards(
  games: NflGameLogShardEntry[],
  root = process.cwd(),
): { shardCount: number; gameCount: number; seasons: string[] } {
  const shardDir = path.join(root, NFL_GAME_LOGS_DIR);
  fs.mkdirSync(shardDir, { recursive: true });

  const bySeason = groupGamesBySeason(games);
  const seasons = [...bySeason.keys()].sort();
  let shardCount = 0;

  for (const season of seasons) {
    const seasonGames = bySeason.get(season) ?? [];
    const lines = seasonGames
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
      )
      .map((g) => JSON.stringify(prepareGameForShard(g)));
    const shardPath = path.join(shardDir, `${season}.ndjson`);
    fs.writeFileSync(shardPath, `${lines.join("\n")}\n`);
    shardCount++;
  }

  return { shardCount, gameCount: games.length, seasons };
}

export function writeNflIngestManifest(
  options: {
    gameCount: number;
    seasons: string[];
    dataSource?: string;
    note?: string;
  },
  root = process.cwd(),
): NflIngestManifest {
  const manifest: NflIngestManifest = {
    data_verified: true,
    data_source: options.dataSource ?? "ESPN + nflverse (2016-2026)",
    last_ingested_at: new Date().toISOString(),
    game_count: options.gameCount,
    seasons: options.seasons,
    note:
      options.note ??
      "Officials from ESPN summaries (2016-2026). Ref-stats rebuilt from DISTINCT game_id.",
  };
  const manifestPath = path.join(root, NFL_MANIFEST_PATH);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function finalizeNflVerifiedArtifacts(
  games: NflGameLogShardEntry[],
  root = process.cwd(),
  manifestOptions?: Partial<{
    dataSource: string;
    note: string;
  }>,
): { shards: ReturnType<typeof writeNflSeasonShards>; manifest: NflIngestManifest } {
  const shards = writeNflSeasonShards(games, root);
  const manifest = writeNflIngestManifest(
    {
      gameCount: shards.gameCount,
      seasons: shards.seasons,
      dataSource: manifestOptions?.dataSource,
      note: manifestOptions?.note,
    },
    root,
  );
  return { shards, manifest };
}
