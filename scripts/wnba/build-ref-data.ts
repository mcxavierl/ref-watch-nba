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
import { rebuildTeamSplitsFromGameLogs } from "../lib/rebuild-team-splits-from-logs";
import { enrichWnbaGameLogOfficials } from "./enrich-game-log-officials";
import { buildWnbaRefStatsFromLogs } from "./lib/build-ref-stats-from-logs";
import { splitRefStatsForDeploy } from "../lib/split-ref-stats";
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
      note: "WNBA game logs and slate assignments load from ESPN. Referee profiles populate as crews publish.",
    },
    refs: [],
    teamSplits: {},
  };
}

function writeSeasonShards(games: GameLogEntry[]): void {
  fs.mkdirSync(WNBA_SHARD_DIR, { recursive: true });
  const bySeason = new Map<string, GameLogEntry[]>();
  for (const game of games) {
    const bucket = bySeason.get(game.season) ?? [];
    bucket.push(game);
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
  return buildWnbaRefStatsFromLogs(games);
}

async function enrichLogsIfNeeded(games: GameLogEntry[]): Promise<GameLogEntry[]> {
  const missing = games.filter((game) => !game.officials?.length).length;
  if (missing === 0) return games;
  console.log(`Enriching officials for ${missing}/${games.length} WNBA games...`);
  const result = await enrichWnbaGameLogOfficials(games);
  console.log(
    `Official enrichment: added=${result.enriched}, already_present=${result.skipped}`,
  );
  return result.games;
}

async function main(): Promise<void> {
  fs.mkdirSync(WNBA_DATA_DIR, { recursive: true });

  try {
    const assignments = await fetchWnbaAssignments();
    if (assignments.games.length > 0) {
      fs.writeFileSync(
        path.join(WNBA_DATA_DIR, "assignments.json"),
        `${JSON.stringify(assignments, null, 2)}\n`,
      );
      console.log(
        `Assignments: ${assignments.games.length} WNBA game(s) (${assignments.source})`,
      );
    } else {
      console.warn("WNBA assignments fetch returned 0 games; keeping existing file.");
    }
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
  const enriched = await enrichLogsIfNeeded(deduped);
  const stats = buildStatsFromLogs(enriched);
  const teamSplits = rebuildTeamSplitsFromGameLogs("wnba", stats, {
    lastUpdated: new Date().toISOString(),
    league: "WNBA",
    source: stats.meta.source ?? "wnba-stats-api",
    games: enriched,
  });
  stats.teamSplits = teamSplits;
  publishWnbaArtifacts(stats, enriched);
  console.log(
    `WNBA ref stats: ${stats.refs.length} refs, ${deduped.length} games, verified=${stats.meta.data_verified === true}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
