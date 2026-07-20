#!/usr/bin/env npx tsx
/**
 * Post-build gate — Worker static assets must ship ref-stats JSON or SSR shows 0 refs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  PRO_VERIFIED_LIVE_LEAGUE_IDS,
  LAUNCHED_NCAA_LEAGUE_IDS,
  PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "../src/lib/league-verification";
import type { RefStatsFile } from "../src/lib/types";

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, ".open-next", "assets");

type RefStatsLeague =
  | (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number]
  | (typeof LAUNCHED_NCAA_LEAGUE_IDS)[number];

const REF_STATS_LEAGUES = [
  ...PRO_VERIFIED_LIVE_LEAGUE_IDS,
  ...LAUNCHED_NCAA_LEAGUE_IDS,
] as const satisfies readonly RefStatsLeague[];

const MIN_REFS: Record<RefStatsLeague, number> = {
  nba: 50,
  nhl: 50,
  nfl: 50,
  epl: 20,
  laliga: 20,
  cbb: 50,
  wnba: 0,
};

const MIN_GAMES: Record<RefStatsLeague, number> = {
  nba: 1000,
  nhl: 1000,
  nfl: 1000,
  epl: 500,
  laliga: 200,
  cbb: 500,
  wnba: 400,
};

const failures: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
}

function refStatsRel(league: string): string {
  return league === "nba" ? "data/nba/ref-stats.json" : `data/${league}/ref-stats.json`;
}

function teamSplitsRel(league: string): string {
  return league === "nba" ? "data/nba/team-splits.json" : `data/${league}/team-splits.json`;
}

function readStats(rel: string): RefStatsFile | null {
  const file = path.join(ASSETS, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as RefStatsFile;
  } catch {
    return null;
  }
}

function readAssignments(rel: string): { games?: unknown[] } | null {
  const file = path.join(ASSETS, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as { games?: unknown[] };
  } catch {
    return null;
  }
}

if (!fs.existsSync(ASSETS)) {
  fail(".open-next/assets missing — run npm run build:opennext");
} else {
  for (const league of REF_STATS_LEAGUES) {
    const rel = refStatsRel(league);
    const splitsRel = teamSplitsRel(league);

    const stats = readStats(rel);
    if (!stats) {
      fail(`missing Worker asset ${rel}`);
      continue;
    }
    const refs = stats.refs?.length ?? 0;
    const games = stats.meta?.totalGamesProcessed ?? 0;
    if (refs < MIN_REFS[league]) {
      fail(`${rel} has ${refs} refs (need >= ${MIN_REFS[league]})`);
    }
    if (games < MIN_GAMES[league]) {
      fail(`${rel} has ${games} games (need >= ${MIN_GAMES[league]})`);
    }
    if (!stats.meta?.data_verified) {
      fail(`${rel} meta.data_verified is false`);
    }

    const splitsPath = path.join(ASSETS, splitsRel);
    if (!fs.existsSync(splitsPath)) {
      fail(`missing Worker asset ${splitsRel}`);
    }
  }

  for (const league of PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS) {
    const assignmentsRel = `data/${league}/assignments.json`;
    const assignments = readAssignments(assignmentsRel);
    if (!assignments) {
      fail(`missing Worker asset ${assignmentsRel}`);
      continue;
    }
    const gameCount = assignments.games?.length ?? 0;
    if (gameCount < 1) {
      fail(`${assignmentsRel} has ${gameCount} games (need >= 1)`);
    }
  }
}

if (failures.length > 0) {
  console.error("\nOpenNext data asset check FAILED:\n");
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  console.error(
    `\n${failures.length} issue(s). public/data must be copied before opennext build.`,
  );
  process.exit(1);
}

console.log(
  `OpenNext data asset check passed (${VERIFIED_LIVE_LEAGUE_IDS.length} leagues in .open-next/assets).`,
);
