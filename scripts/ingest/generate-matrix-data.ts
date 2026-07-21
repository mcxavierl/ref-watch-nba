#!/usr/bin/env npx tsx
/**
 * Generate matrix-ready ref intelligence after aggregate foul stats are computed.
 * Attaches OfficialStats (primary_archetype, consistency_score) to ref profiles.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { filterGamesForMatrixGeneration } from "./lib/matrix-record-schema";
import { attachRefArchetypesFromGames } from "../lib/attach-ref-archetypes";
import { attachStarDeferenceFromGames } from "../lib/attach-star-deference";
import { loadGameLogs } from "../lib/game-logs";
import { refSlug } from "../lib/slug";
import type { LeagueId } from "../../src/lib/leagues";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";

const ROOT = process.cwd();

const MATRIX_LEAGUES: Array<{
  leagueId: LeagueId;
  dataLeague: "NBA" | "NFL" | "NHL" | "EPL" | "LALIGA" | "WNBA";
}> = [
  { leagueId: "nba", dataLeague: "NBA" },
  { leagueId: "nfl", dataLeague: "NFL" },
  { leagueId: "nhl", dataLeague: "NHL" },
  { leagueId: "epl", dataLeague: "EPL" },
  { leagueId: "laliga", dataLeague: "LALIGA" },
  { leagueId: "wnba", dataLeague: "WNBA" },
];

function statsPathForLeague(leagueId: LeagueId): string {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats.json");
}

function corePathForLeague(leagueId: LeagueId): string | null {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats-core.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats-core.json");
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Recompute aggregate foul stats from officiated game logs before archetype scoring. */
function refreshAggregateFoulStats(
  profiles: RefProfile[],
  games: import("../lib/game-logs").GameLogEntry[],
  leagueId: LeagueId,
): RefProfile[] {
  const foulsByOfficial = new Map<string, { total: number; games: number }>();

  for (const game of games) {
    const whistleTotal =
      leagueId === "nfl"
        ? (game.homeFlags ?? 0) + (game.awayFlags ?? 0)
        : leagueId === "nhl"
          ? (game.homeMinors ?? 0) + (game.awayMinors ?? 0)
          : game.totalFouls;

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const bucket = foulsByOfficial.get(slug) ?? { total: 0, games: 0 };
      bucket.total += whistleTotal;
      bucket.games += 1;
      foulsByOfficial.set(slug, bucket);
    }
  }

  return profiles.map((profile) => {
    const bucket = foulsByOfficial.get(profile.slug);
    if (!bucket || bucket.games === 0) return profile;
    return {
      ...profile,
      avgFouls: round1(bucket.total / bucket.games),
    };
  });
}

export function generateMatrixDataForLeague(
  leagueId: LeagueId,
  dataLeague: "NBA" | "NFL" | "NHL" | "EPL" | "LALIGA" | "WNBA",
): number {
  const statsPath = statsPathForLeague(leagueId);
  if (!fs.existsSync(statsPath)) {
    console.log(`skip ${leagueId}: missing ${statsPath}`);
    return 0;
  }

  const logs = loadGameLogs(dataLeague);
  if (!logs?.games?.length) {
    console.log(`skip ${leagueId}: no game logs`);
    return 0;
  }

  const { games: validatedGames, excludedGames, excludedRecords, skippedIncomplete } =
    filterGamesForMatrixGeneration(logs.games, leagueId);
  if (skippedIncomplete > 0) {
    console.log(
      `${leagueId}: skipped ${skippedIncomplete} game(s) with no official assignments`,
    );
  }
  if (excludedGames > 0) {
    console.error(
      `${leagueId}: excluded ${excludedGames} game(s) and ${excludedRecords} invalid matrix record(s)`,
    );
  }
  if (!validatedGames.length) {
    console.log(`skip ${leagueId}: no valid matrix games after schema validation`);
    return 0;
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
  const withFoulAggregates = refreshAggregateFoulStats(stats.refs, validatedGames, leagueId);
  const withArchetypes = attachRefArchetypesFromGames(withFoulAggregates, validatedGames, leagueId);
  const updatedRefs = attachStarDeferenceFromGames(withArchetypes, validatedGames, leagueId);
  const tagged = updatedRefs.filter((ref) => ref.officialStats !== undefined).length;

  const nextStats: RefStatsFile = {
    ...stats,
    refs: updatedRefs,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
    },
  };

  fs.writeFileSync(statsPath, `${JSON.stringify(nextStats, null, 2)}\n`);

  const corePath = corePathForLeague(leagueId);
  if (corePath && fs.existsSync(corePath)) {
    const core = JSON.parse(fs.readFileSync(corePath, "utf8")) as {
      refs: RefProfile[];
      meta: RefStatsFile["meta"];
    };
    const coreBySlug = new Map(updatedRefs.map((ref) => [ref.slug, ref]));
    const nextCoreRefs = core.refs.map((ref) => {
      const fresh = coreBySlug.get(ref.slug);
      return fresh
        ? {
            ...ref,
            avgFouls: fresh.avgFouls,
            officialStats: fresh.officialStats,
          }
        : ref;
    });
    fs.writeFileSync(
      corePath,
      `${JSON.stringify({ ...core, refs: nextCoreRefs, meta: nextStats.meta }, null, 2)}\n`,
    );
  }

  console.log(`${leagueId}: matrix archetypes attached to ${tagged}/${updatedRefs.length} refs`);
  return tagged;
}

export function generateMatrixData(root = ROOT): number {
  let total = 0;
  const previousRoot = process.cwd();
  process.chdir(root);
  try {
    for (const { leagueId, dataLeague } of MATRIX_LEAGUES) {
      total += generateMatrixDataForLeague(leagueId, dataLeague);
    }
  } finally {
    process.chdir(previousRoot);
  }
  return total;
}

function main(): void {
  console.log("=== Generate matrix data (aggregate fouls + archetypes) ===\n");
  const total = generateMatrixData();
  console.log(`\nDone. ${total} refs tagged across leagues.`);
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}
