#!/usr/bin/env npx tsx
/**
 * Morning slate refresh (intended ~9:05 AM ET via cron):
 * Delegates to the shared slate poller with alerts and integrity enabled.
 */
import { runSlatePoll } from "../src/lib/cron/slatePoller";

async function main() {
  const result = await runSlatePoll({
    force: true,
    rebuildOverview: false,
    writeAlerts: true,
    runIntegrity: true,
  });

  console.log("\nMorning slate result:");
  console.log(JSON.stringify(result, null, 2));

  if (result.status === "error") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
