#!/usr/bin/env npx tsx
import { execSync } from "node:child_process";
import { runPostIngestInsightGenerator } from "./lib/post-ingest-insights";

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await runPostIngestInsightGenerator({ force });

  try {
    execSync("npx tsx scripts/build-overview-drilldowns.ts", { stdio: "inherit" });
  } catch {
    console.warn("Drilldown rebuild skipped or failed — overview insights still written.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
