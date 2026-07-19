#!/usr/bin/env npx tsx
/**
 * WNBA verified ingest scaffold: assignments fetch + rebuild from game logs.
 *
 * Usage:
 *   npm run build-wnba-data          - fetch assignments, rebuild when logs exist
 *   npm run rebuild-wnba-from-logs   - rebuild ref-stats from game-logs.json
 *   npm run validate-wnba-ingest       - validation gates
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchWnbaAssignments } from "../lib/parse-assignments";
import { dedupeGameLogs, loadGameLogs, saveGameLogs, type GameLogEntry } from "../lib/game-logs";
import { rebuildRefGamesFromLogs } from "../lib/rebuild-ref-games-from-logs";
import { rebuildTeamSplitsFromGameLogs } from "../lib/rebuild-team-splits-from-logs";
import { splitRefStatsForDeploy } from "../lib/split-ref-stats";
import { processNbaFoulShardEntry } from "../ingest/lib/ingest-utils";
import { WNBA_TEAM_ABBRS } from "../../src/lib/wnba/teams";
import type { RefStatsFile } from "../../src/lib/types";

const WNBA_DATA_DIR = path.join(process.cwd(), "data", "wnba");
const WNBA_SHARD_DIR = path.join(WNBA_DATA_DIR, "game-logs");

const FALLBACK_WNBA = {
  leagueAvgTotal: 165,
  leagueAvgFouls: 34,
  leagueOverBaseline: 165,
} as const;

function emptyStats(): RefStatsFile {
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
      leagueAvgTotal: FALLBACK_WNBA.leagueAvgTotal,
      leagueAvgFouls: FALLBACK_WNBA.leagueAvgFouls,
      leagueOverBaseline: FALLBACK_WNBA.leagueOverBaseline,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: false,
      data_verified: false,
      data_source: "synthetic",
      note: "WNBA verified ingest pending. Run live fetch or rebuild-from-logs when game logs exist.",
    },
    refs: [],
    teamSplits: {},
  };
}

function tagWnbaGameFouls(game: GameLogEntry): GameLogEntry {
  if (!game.fouls?.length) return game;
  return {
    ...game,
    ...processNbaFoulShardEntry({
      gameId: game.gameId,
      season: game.season,
      fouls: game.fouls,
    }),
  };
}

function writeSeasonShards(games: GameLogEntry[]): void {
  fs.mkdirSync(WNBA_SHARD_DIR, { recursive: true });
  const bySeason = new Map<string, GameLogEntry[]>();
  for (const game of games) {
    const bucket = bySeason.get(game.season) ?? [];
    bucket.push(tagWnbaGameFouls(game));
    bySeason.set(game.season, bucket);
  }
  for (const [season, rows] of bySeason) {
    const shardPath = path.join(WNBA_SHARD_DIR, `${season}.ndjson`);
    fs.writeFileSync(
      shardPath,
      `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    );
  }
}

function writeManifest(stats: RefStatsFile, gameCount: number): void {
  const manifest = {
    league: "WNBA",
    lastUpdated: new Date().toISOString(),
    seasons: stats.meta.seasons,
    game_count: gameCount,
    data_verified: stats.meta.data_verified === true,
    team_count: WNBA_TEAM_ABBRS.length,
  };
  fs.writeFileSync(
    path.join(WNBA_DATA_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function publishWnbaArtifacts(stats: RefStatsFile, games: GameLogEntry[]): void {
  fs.mkdirSync(WNBA_DATA_DIR, { recursive: true });
  const deduped = dedupeGameLogs(games);
  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "WNBA",
    source: stats.meta.source ?? "wnba-stats-api",
    games: deduped,
  });
  writeSeasonShards(deduped);

  const { core, teamSplits } = splitRefStatsForDeploy(stats);
  for (const file of ["ref-stats.json", "ref-stats-core.json"]) {
    fs.writeFileSync(
      path.join(WNBA_DATA_DIR, file),
      `${JSON.stringify(file.endsWith("core") ? core : stats, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(WNBA_DATA_DIR, "team-splits.json"),
    `${JSON.stringify(teamSplits, null, 2)}\n`,
  );
  writeManifest(stats, deduped.length);
}

function buildStatsFromLogs(games: GameLogEntry[]): RefStatsFile {
  let stats = emptyStats();
  const seasons = [...new Set(games.map((g) => g.season))].sort();
  stats.meta.seasons = seasons;
  stats.meta.source = "wnba-stats-api";
  stats.meta.lastUpdated = new Date().toISOString();

  const logs = {
    lastUpdated: new Date().toISOString(),
    league: "WNBA" as const,
    source: "wnba-stats-api",
    games,
  };

  stats = rebuildRefGamesFromLogs(stats, logs, { useCanonicalKey: true, seasons });
  const teamSplits = rebuildTeamSplitsFromGameLogs(logs, WNBA_TEAM_ABBRS);
  stats.teamSplits = teamSplits;

  const gameCount = games.length;
  const minGamesForVerify = Number.parseInt(
    process.env.WNBA_MIN_GAMES ?? "3000",
    10,
  );
  if (gameCount >= minGamesForVerify && stats.refs.length > 0) {
    stats.meta.data_verified = true;
    stats.meta.data_source = "verified";
  }

  return stats;
}

async function main(): Promise<void> {
  fs.mkdirSync(WNBA_DATA_DIR, { recursive: true });

  try {
    const assignments = await fetchWnbaAssignments();
    fs.writeFileSync(
      path.join(WNBA_DATA_DIR, "assignments.json"),
      `${JSON.stringify(assignments, null, 2)}\n`,
    );
    console.log(
      `Assignments: ${assignments.games.length} WNBA game(s) (${assignments.source})`,
    );
  } catch (err) {
    console.warn("WNBA assignments fetch failed:", err);
  }

  const fromLogs =
    process.argv.includes("--from-logs") || process.env.WNBA_FROM_LOGS === "1";

  const existing = loadGameLogs("WNBA");
  if (!existing?.games?.length) {
    if (fromLogs) {
      console.error("No WNBA game logs found at data/wnba/game-logs.json");
      process.exit(1);
    }
    const scaffold = emptyStats();
    publishWnbaArtifacts(scaffold, []);
    console.log("WNBA scaffold written (no game logs yet).");
    return;
  }

  const deduped = dedupeGameLogs(existing.games);
  const stats = buildStatsFromLogs(deduped);
  publishWnbaArtifacts(stats, deduped);
  console.log(
    `WNBA ref stats: ${stats.refs.length} refs, ${deduped.length} games, verified=${stats.meta.data_verified === true}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
