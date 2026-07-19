#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";

const dataDir = path.join(process.cwd(), "data", "wnba");

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
      note:
        "WNBA Phase 1 scaffold. Assignments only. Run npm run fetch-wnba-assignments for tonight's crews.",
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
  const odds = {
    lastUpdated: new Date().toISOString(),
    source: "seeded",
    note: "WNBA odds shard pending Phase 2 ingest.",
    lines: [],
  };

  for (const file of ["ref-stats-core.json", "ref-stats.json"]) {
    fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(stats, null, 2)}\n`);
  }
  fs.writeFileSync(path.join(dataDir, "assignments.json"), `${JSON.stringify(assignments, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "odds.json"), `${JSON.stringify(odds, null, 2)}\n`);
  console.log("WNBA Phase 1 seed written to data/wnba/");
}

main();
