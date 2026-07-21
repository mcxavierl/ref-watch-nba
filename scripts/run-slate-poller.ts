#!/usr/bin/env npx tsx
/**
 * Morning assignment-window poller.
 * Polls every 10 minutes during 8:00 AM - 12:00 PM ET (see GitHub workflow).
 */
import { runSlatePoll } from "../src/lib/cron/slatePoller";

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const result = await runSlatePoll({
    force,
    rebuildOverview: true,
    runIntegrity: process.argv.includes("--integrity"),
    writeAlerts: process.argv.includes("--alerts"),
  });

  console.log("\nSlate poll result:");
  console.log(JSON.stringify(result, null, 2));

  if (result.status === "error") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
