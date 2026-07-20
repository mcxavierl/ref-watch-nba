#!/usr/bin/env npx tsx
/**
 * Brand surface audit — header chrome, OG accents, accent-brand token usage,
 * and league logo centralization.
 *
 * Usage: npm run audit:brand-surfaces
 */
import { join } from "node:path";
import { scanBrandSurfaces } from "./lib/brand-surface-scan";

const ROOT = join(import.meta.dirname, "..");

function main(): void {
  const violations = scanBrandSurfaces(ROOT);

  if (violations.length === 0) {
    console.log("Brand surface audit passed (header, OG, accent-brand, league logos).");
    return;
  }

  const grouped = new Map<string, number>();
  for (const violation of violations) {
    grouped.set(violation.rule, (grouped.get(violation.rule) ?? 0) + 1);
  }

  console.error(`Brand surface audit failed (${violations.length} issue(s)):\n`);
  for (const violation of violations) {
    const location = violation.line
      ? `${violation.file}:${violation.line}`
      : violation.file;
    const excerpt = violation.excerpt ? ` ${violation.excerpt}` : "";
    console.error(`  - [${violation.rule}] ${location} — ${violation.message}${excerpt}`);
  }

  console.error("\nSummary:");
  for (const [rule, count] of grouped.entries()) {
    console.error(`  ${rule}: ${count}`);
  }

  process.exit(1);
}

main();
