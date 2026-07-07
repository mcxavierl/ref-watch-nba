#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRefStats } from "./lib/build-ref-stats";
import { fetchAssignments } from "./lib/parse-assignments";
import { buildBaselinesFile, saveBaselines } from "./lib/baselines";
import { loadGameLogs } from "./lib/game-logs";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  console.log("=== Ref Watch NBA data build ===\n");

  try {
    const assignments = await fetchAssignments();
    fs.writeFileSync(
      path.join(dataDir, "assignments.json"),
      JSON.stringify(assignments, null, 2),
    );
    console.log(
      `Assignments: ${assignments.games.length} NBA game(s) (${assignments.source})`,
    );
  } catch (err) {
    console.warn("Assignments fetch failed:", err);
  }

  const refStats = await buildRefStats();
  fs.writeFileSync(
    path.join(dataDir, "ref-stats.json"),
    JSON.stringify(refStats, null, 2),
  );
  console.log(
    `Ref stats: ${refStats.refs.length} refs (${refStats.meta.source})`,
  );

  const nbaLogs = loadGameLogs("NBA");
  const nhlLogs = loadGameLogs("NHL");
  const baselines = buildBaselinesFile(
    nbaLogs?.games ?? [],
    nhlLogs?.games ?? [],
    "Computed from exported game logs",
  );
  saveBaselines(baselines);
  console.log(
    `Baselines: NBA ${baselines.NBA.aggregate.gameCount} games, NHL ${baselines.NHL.aggregate.gameCount} games`,
  );

  console.log(`\nDone. Data written to ${dataDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
