#!/usr/bin/env npx tsx
import { execSync } from "node:child_process";
import { runPostIngestInsightGenerator } from "./lib/post-ingest-insights";

runPostIngestInsightGenerator();

try {
  execSync("npx tsx scripts/build-overview-drilldowns.ts", { stdio: "inherit" });
} catch {
  console.warn("Drilldown rebuild skipped or failed — overview insights still written.");
}
