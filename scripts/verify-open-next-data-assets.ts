#!/usr/bin/env npx tsx
/**
 * Post-build gate — Worker static assets must ship ref-stats JSON or SSR shows 0 refs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { VERIFIED_LIVE_LEAGUE_IDS } from "../src/lib/league-verification";
import type { RefStatsFile } from "../src/lib/types";

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, ".open-next", "assets");

const MIN_REFS: Record<(typeof VERIFIED_LIVE_LEAGUE_IDS)[number], number> = {
  nba: 50,
  nhl: 50,
  nfl: 50,
  epl: 20,
  laliga: 20,
};

const MIN_GAMES: Record<(typeof VERIFIED_LIVE_LEAGUE_IDS)[number], number> = {
  nba: 1000,
  nhl: 1000,
  nfl: 1000,
  epl: 500,
  laliga: 200,
};

const failures: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
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

if (!fs.existsSync(ASSETS)) {
  fail(".open-next/assets missing — run npm run build:opennext");
} else {
  for (const league of VERIFIED_LIVE_LEAGUE_IDS) {
    const rel =
      league === "nba"
        ? "data/nba/ref-stats.json"
        : `data/${league}/ref-stats.json`;
    const splitsRel =
      league === "nba"
        ? "data/nba/team-splits.json"
        : `data/${league}/team-splits.json`;

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
