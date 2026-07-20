#!/usr/bin/env npx tsx
/**
 * Design token parity audit for Clinical Modern surfaces.
 *
 * Fails when:
 * - Guarded --clinical-*, --methodology-*, --accent-*, or --wc-* vars are used without
 *   a definition in theme-tokens.css, clinical-doc-tokens.css, globals.css, or worldcup-delight.css
 * - figma/design-tokens.json semantic colors drift from live CSS tokens
 * - --wc-* capsule tokens are defined outside canonical World Cup token files
 *
 * Usage: npm run audit:design-tokens
 */
import { join } from "node:path";
import { scanDesignTokenParity } from "./lib/design-token-scan";

const ROOT = join(import.meta.dirname, "..");

function main(): void {
  const violations = scanDesignTokenParity(ROOT);

  if (violations.length === 0) {
    console.log("Design token parity audit passed (clinical/accent/wc + figma).");
    return;
  }

  const grouped = new Map<string, number>();
  for (const violation of violations) {
    grouped.set(violation.rule, (grouped.get(violation.rule) ?? 0) + 1);
  }

  console.error(`Design token parity audit failed (${violations.length} issue(s)):\n`);
  for (const violation of violations) {
    const location =
      violation.line > 0
        ? `${violation.file}:${violation.line}`
        : violation.file;
    console.error(`  - [${violation.rule}] ${location} ${violation.excerpt}`);
  }

  console.error("\nSummary:");
  for (const [rule, count] of grouped.entries()) {
    console.error(`  ${rule}: ${count}`);
  }

  process.exit(1);
}

main();
