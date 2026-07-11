#!/usr/bin/env npx tsx
/**
 * Daily volume-integrity gate — catches interrupted ingests before they ship.
 *
 * Checks per live league:
 * - total games vs claimed season window
 * - per-season coverage in game-logs.json
 * - reverse-name ghost profiles
 * - matrix baseline + top/bottom panels on a sample team
 * - trends baselines not on fallback
 */
import {
  formatVolumeSummaryTable,
  runVolumeRegressionChecks,
} from "./lib/volume-regression";

console.log("Volume regression check…");
const { failures, summaries } = runVolumeRegressionChecks();

console.log("\n" + formatVolumeSummaryTable(summaries));

if (failures.length > 0) {
  console.error("\nVolume regression check FAILED:\n");
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  console.error(
    `\n${failures.length} issue(s). Fix before deploy — see scripts/check-volume-regression.ts`,
  );
  process.exit(1);
}

console.log(
  `\nVolume regression check passed (${summaries.length} live leagues, volumes + matrix baselines OK).`,
);
