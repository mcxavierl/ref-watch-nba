#!/usr/bin/env npx tsx
/**
 * Fast pre-push / pre-merge gate for the failures that most often break CI.
 * Runs in ~45-90s locally (vs ~7m for full check:ci).
 *
 * Usage: npm run check:preflight
 */
import { execSync } from "node:child_process";

const steps: { label: string; command: string }[] = [
  { label: "Merge conflict markers", command: "npm run check:no-conflict-markers" },
  { label: "Typecheck", command: "npm run typecheck" },
  { label: "Client import boundary", command: "npm run check:client-imports" },
  { label: "Coupled test change gate", command: "npm run check:coupled-tests" },
  { label: "Enterprise API route contracts", command: "npm run check:enterprise-api-routes" },
  { label: "Generated artifact freshness", command: "npm run check:artifact-freshness" },
  { label: "Hero theme token guard", command: "npx tsx scripts/check-hero-theme-tokens.ts" },
  { label: "Em dash copy", command: "npm run check:no-em-dashes" },
  { label: "Homepage product audit", command: "npm run audit:homepage-product" },
  {
    label: "Design guardrail tests",
    command:
      "npx tsx --test src/lib/design-audit.test.ts src/lib/clinical-modern-surfaces.test.ts src/lib/strategic-pivot.test.ts",
  },
];

for (const step of steps) {
  console.log(`\n→ ${step.label}`);
  execSync(step.command, { stdio: "inherit" });
}

console.log(
  "\ncheck-preflight: OK — run npm run check:ci before merge for full CI mirror (theme matrix, build, e2e audits)",
);
console.log("check-preflight: do not push with SKIP_SHIP_CHECK=1 unless CI is already green");
