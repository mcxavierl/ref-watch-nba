#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import { FALLBACK_CBB } from "../lib/baselines";

const dataDir = path.join(process.cwd(), "data", "cbb");

function emptyStats(): RefStatsFile {
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
      leagueAvgTotal: FALLBACK_CBB.leagueAvgTotal,
      leagueAvgFouls: FALLBACK_CBB.leagueAvgFouls,
      leagueOverBaseline: FALLBACK_CBB.leagueOverBaseline,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: false,
      note:
        "NCAA men's basketball offseason seed — empty slate. Run npm run build-cbb-data for ESPN backfill.",
    },
    refs: [],
    teamSplits: {},
  };
}

function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const stats = emptyStats();
  const assignments = {
    lastUpdated: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    source: "seeded",
    games: [],
  };
  const gameLogs = {
    lastUpdated: new Date().toISOString(),
    league: "CBB",
    source: "offseason-seed",
    games: [],
  };

  for (const file of ["ref-stats.seed.json", "ref-stats.json"]) {
    fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(stats, null, 2)}\n`);
  }
  fs.writeFileSync(path.join(dataDir, "assignments.json"), `${JSON.stringify(assignments, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "game-logs.json"), `${JSON.stringify(gameLogs, null, 2)}\n`);
  console.log("CBB offseason seed written to data/cbb/");
}

main();
