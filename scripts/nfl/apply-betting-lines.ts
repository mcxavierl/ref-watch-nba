#!/usr/bin/env npx tsx
/**
 * Apply nflverse closing lines to NFL game logs and ref betting stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import {
  dedupeGameLogs,
  loadGameLogs,
  saveGameLogs,
  type GameLogEntry,
} from "../lib/game-logs";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";
import {
  buildNflverseLineIndex,
  fetchNflverseGamesCsv,
  lookupNflLine,
  type NflverseLineIndex,
} from "./lib/nflverse-lines";
import { homeCoverRate, NflBettingAccumulator } from "./lib/nfl-betting";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");
const MIN_LINE_GAMES_FOR_REF = 10;
const MIN_LINE_COVERAGE = 0.25;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

async function loadLineIndex(): Promise<NflverseLineIndex> {
  const cachePath = path.join(DATA_DIR, "nflverse-games.csv");
  try {
    if (fs.existsSync(cachePath)) {
      return buildNflverseLineIndex(fs.readFileSync(cachePath, "utf8"), 2021);
    }
  } catch {
    /* refetch */
  }
  console.log("Fetching nflverse games.csv...");
  const csv = await fetchNflverseGamesCsv();
  fs.writeFileSync(cachePath, csv);
  return buildNflverseLineIndex(csv, 2021);
}

function applyLineToGame(
  game: GameLogEntry,
  index: NflverseLineIndex,
): GameLogEntry {
  const line = lookupNflLine(index, game);
  if (!line) return game;
  const totalPoints = game.homeScore + game.awayScore;
  return {
    ...game,
    closingTotal: line.total,
    homeSpread: line.homeSpread,
    lineSource: "external",
    totalPoints,
  };
}

function rebuildRefBetting(
  games: GameLogEntry[],
  index: NflverseLineIndex,
): {
  matchedGames: number;
  refAccumulators: Map<string, NflBettingAccumulator>;
} {
  const refAccumulators = new Map<string, NflBettingAccumulator>();
  let matchedGames = 0;

  for (const game of games) {
    const line = lookupNflLine(index, game);
    if (!line || game.officials.length === 0) continue;
    matchedGames++;

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const acc = refAccumulators.get(slug) ?? new NflBettingAccumulator(true);
      acc.addGame({
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        homeSpread: line.homeSpread,
        total: line.total,
      });
      refAccumulators.set(slug, acc);
    }
  }

  return { matchedGames, refAccumulators };
}

function mergeBettingIntoRefs(
  refs: RefProfile[],
  refAccumulators: Map<string, NflBettingAccumulator>,
): RefProfile[] {
  return refs.map((ref) => {
    const acc = refAccumulators.get(ref.slug);
    if (!acc) return ref;

    const betting = acc.finalize();
    const lineGames =
      betting.homeTeamRecord.wins +
      betting.homeTeamRecord.losses +
      betting.homeTeamRecord.pushes;
    if (lineGames < MIN_LINE_GAMES_FOR_REF) {
      return ref;
    }

    const ou = betting.overUnder.overall;
    const ouDecisions = ou.wins + ou.losses + ou.pushes;
    const overRate = round3(ou.wins / Math.max(1, ouDecisions));

    return {
      ...ref,
      overRate,
      homeCoverRate: homeCoverRate(betting),
      bettingStats: betting,
    };
  });
}

async function main() {
  const statsRaw = fs.readFileSync(STATS_PATH, "utf8");
  const stats = JSON.parse(statsRaw) as RefStatsFile;
  const logs = loadGameLogs("NFL");
  if (!logs) {
    console.error("No NFL game logs found.");
    process.exit(1);
  }

  const index = await loadLineIndex();
  const updatedGames = logs.games.map((g) => applyLineToGame(g, index));
  const deduped = dedupeGameLogs(updatedGames);
  const externalCount = deduped.filter((g) => g.lineSource === "external").length;

  const { matchedGames, refAccumulators } = rebuildRefBetting(deduped, index);

  const updatedRefs = mergeBettingIntoRefs(stats.refs, refAccumulators);
  const refsWithLines = updatedRefs.filter((r) => r.bettingStats?.linesAvailable).length;
  const coverage = deduped.length > 0 ? externalCount / deduped.length : 0;
  const atsAvailable =
    coverage >= MIN_LINE_COVERAGE && refsWithLines >= 3;

  const output: RefStatsFile = {
    ...stats,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
      atsAvailable,
      note: atsAvailable
        ? `ATS/O-U from nflverse closing lines on ${externalCount}/${deduped.length} logged games (${refsWithLines} refs with ${MIN_LINE_GAMES_FOR_REF}+ lined games).`
        : stats.meta.note,
    },
    refs: updatedRefs,
  };

  saveGameLogs({
    ...logs,
    lastUpdated: new Date().toISOString(),
    games: deduped,
  });
  fs.writeFileSync(STATS_PATH, `${JSON.stringify(output, null, 2)}\n`);

  console.log(
    `Applied nflverse lines: ${externalCount}/${deduped.length} game logs, ` +
      `${matchedGames} with officials, ${refsWithLines} refs with betting splits. ` +
      `atsAvailable=${atsAvailable}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
