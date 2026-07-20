#!/usr/bin/env npx tsx
/**
 * Fast pre-push / pre-merge gate for the failures that most often break main.
 * Runs in ~30s locally (vs ~7m for full check:ci).
 *
 * Usage: npm run check:preflight
 */
import { execSync } from "node:child_process";

const steps: { label: string; command: string }[] = [
  { label: "Merge conflict markers", command: "npm run check:no-conflict-markers" },
  { label: "Typecheck", command: "npm run typecheck" },
  { label: "Generated artifact freshness", command: "npm run check:artifact-freshness" },
  { label: "Em dash copy", command: "npm run check:no-em-dashes" },
];

for (const step of steps) {
  console.log(`\n→ ${step.label}`);
  execSync(step.command, { stdio: "inherit" });
}

console.log("\ncheck-preflight: OK (run npm run check:ci before merge for full CI mirror)");
