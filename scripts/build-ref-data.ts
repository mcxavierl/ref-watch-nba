#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { buildRefStats } from "./lib/build-ref-stats";
import { applyBbrRefTeamStats } from "./lib/apply-bbr-ref-team-stats";
import { loadBbrRefTeamRecords } from "./lib/bbr-ref-team-records";
import { fetchAssignments } from "./lib/parse-assignments";
import { buildBaselinesFile, saveBaselines } from "./lib/baselines";
import { loadGameLogs } from "./lib/game-logs";
import { dedupeRefsInPlace } from "./lib/merge-duplicate-refs";

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

  let refStats = await buildRefStats();

  const bbrFixture = loadBbrRefTeamRecords();
  if (bbrFixture) {
    const applied = applyBbrRefTeamStats(refStats, bbrFixture);
    refStats = applied.stats;
    console.log(
      `BBR ref×team W-L merged: ${applied.matchedPairs} pairs (${bbrFixture.stats.refTeamPairs} in fixture)`,
    );
    if (applied.unmatchedReferees.length > 0) {
      console.warn(
        `BBR name match failures (${applied.unmatchedReferees.length}): ${applied.unmatchedReferees.join(", ")}`,
      );
    }
  } else {
    console.warn(
      "No data/bbr-ref-team-records.json — run npm run build-bbr-ref-team-data for real ref×team W-L",
    );
  }

  dedupeRefsInPlace(
    refStats.refs,
    refStats.meta.leagueAvgTotal,
    refStats.meta.leagueAvgFouls,
  );

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

  console.log("\n--- Regenerating overview insights ---");
  const { runPostIngestInsightGenerator } = await import("./lib/post-ingest-insights");
  runPostIngestInsightGenerator();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
