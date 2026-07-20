#!/usr/bin/env npx tsx
/**
 * Raw Tailwind / hex color drift audit for Clinical Modern surfaces.
 *
 * Fails when:
 * - text-slate-600 (and similar dim utilities) appear in ref-card / clinical-card / wc-data-capsule sources
 * - Hardcoded hex colors appear outside token/brand allowlists
 * - Deprecated prestige gold #BFA86A appears outside OG/token sources
 *
 * Usage: npm run audit:color-drift
 */
import { join } from "node:path";
import { scanColorDrift } from "./lib/color-drift-scan";

const ROOT = join(import.meta.dirname, "..");

function main(): void {
  const violations = scanColorDrift(ROOT);

  if (violations.length === 0) {
    console.log("Color drift audit passed (clinical surfaces + hex allowlists).");
    return;
  }

  const grouped = new Map<string, number>();
  for (const violation of violations) {
    grouped.set(violation.rule, (grouped.get(violation.rule) ?? 0) + 1);
  }

  console.error(`Color drift audit failed (${violations.length} issue(s)):\n`);
  for (const violation of violations) {
    console.error(
      `  - [${violation.rule}] ${violation.file}:${violation.line} ${violation.excerpt}`,
    );
  }

  console.error("\nSummary:");
  for (const [rule, count] of grouped.entries()) {
    console.error(`  ${rule}: ${count}`);
  }

  process.exit(1);
}

main();
