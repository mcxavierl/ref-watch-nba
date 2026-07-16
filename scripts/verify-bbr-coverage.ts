#!/usr/bin/env npx tsx
import { verifyBbrCoverage } from "./lib/verify-bbr-coverage";

function main(): void {
  const result = verifyBbrCoverage();
  console.log(
    `BBR coverage: ${result.entryCount}/150 team-seasons, ${result.refTeamPairs} ref×team pairs`,
  );
  if (result.refTeamWinLossSource) {
    console.log(`ref-stats overlay: ${result.refTeamWinLossSource}`);
  }
  for (const msg of result.warnings) console.warn(`WARN: ${msg}`);
  for (const msg of result.errors) console.error(`FAIL: ${msg}`);
  if (!result.ok) process.exit(1);
  console.log("BBR coverage OK.");
}

main();
