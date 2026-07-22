#!/usr/bin/env npx tsx
/**
 * Fail when homepage hero copy uses hardcoded always-white ink that breaks
 * light-mode theme matrix contrast probes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const HERO_CSS = join(ROOT, "src/components/overview-intelligence-hero.css");

function main(): void {
  const css = readFileSync(HERO_CSS, "utf8");
  const failures: string[] = [];

  if (/\.overview-hero-headline\s*\{[^}]*color:\s*rgb\(\s*255\s+255\s+255/.test(css)) {
    failures.push(
      "overview-hero-headline must use var(--clinical-ink), not rgb(255 255 255)",
    );
  }

  if (/\.overview-live-slate-title\s*\{[^}]*color:\s*rgb\(\s*226\s+232\s+240/.test(css)) {
    failures.push(
      "overview-live-slate-title must use var(--clinical-ink), not slate-200 hardcode",
    );
  }

  if (failures.length > 0) {
    console.error("check-hero-theme-tokens FAILED:\n");
    for (const failure of failures) {
      console.error(`  ✗ ${failure}`);
    }
    process.exit(1);
  }

  console.log("check-hero-theme-tokens: OK");
}

main();
