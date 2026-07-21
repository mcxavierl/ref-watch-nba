#!/usr/bin/env npx tsx
/**
 * Nightly in-season refresh for all live leagues:
 * assignments → optional odds → projection cache → overview snapshot rebuild.
 *
 * Intended ~9:05 AM ET via cron or GitHub Actions.
 */
import { execSync } from "node:child_process";
import { runSlatePoll } from "../src/lib/cron/slatePoller";

async function main(): Promise<void> {
  console.log("Nightly slate refresh (all live leagues)");

  const result = await runSlatePoll({
    force: true,
    rebuildOverview: true,
    runIntegrity: true,
  });

  console.log("\n--- Ref-Intelligence archetypes ---");
  execSync("npx tsx scripts/ingest/generate-matrix-data.ts", { stdio: "inherit" });

  console.log("\nNightly slate refresh complete.");
  console.log(JSON.stringify(result, null, 2));

  if (result.status === "error") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
