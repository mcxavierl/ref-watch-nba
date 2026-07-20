#!/usr/bin/env npx tsx
/**
 * Nightly in-season refresh for all live leagues:
 * assignments → optional odds → overview snapshot rebuild.
 *
 * Intended ~9:05 AM ET via cron or GitHub Actions.
 */
import { execSync } from "node:child_process";

const STEPS: { label: string; command: string; optional?: boolean }[] = [
  { label: "NBA assignments", command: "npm run fetch-assignments" },
  { label: "WNBA assignments", command: "npm run fetch-wnba-assignments", optional: true },
  { label: "NHL assignments", command: "npm run fetch-nhl-assignments" },
  { label: "NFL assignments", command: "npm run fetch-nfl-assignments" },
  { label: "EPL assignments", command: "npm run fetch-epl-assignments" },
  { label: "La Liga assignments", command: "npm run fetch-laliga-assignments", optional: true },
  { label: "NBA odds", command: "npm run fetch-odds", optional: true },
  { label: "NHL odds", command: "npm run fetch-nhl-odds", optional: true },
  { label: "NFL odds", command: "npm run fetch-nfl-odds", optional: true },
];

function runStep(label: string, command: string, optional = false): void {
  console.log(`\n--- ${label} ---`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    if (optional) {
      console.warn(`${label} failed — continuing.`);
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  console.log("Nightly slate refresh (all live leagues)");

  for (const step of STEPS) {
    runStep(step.label, step.command, step.optional);
  }

  console.log("\n--- Overview snapshot ---");
  execSync("npx tsx scripts/build-overview-snapshot.ts", { stdio: "inherit" });
  execSync("npx tsx scripts/build-overview-insights.ts", { stdio: "inherit" });

  console.log("\n--- Ref-Intelligence archetypes ---");
  execSync("npx tsx scripts/ingest/generate-matrix-data.ts", { stdio: "inherit" });

  console.log("\nNightly slate refresh complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
