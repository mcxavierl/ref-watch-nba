#!/usr/bin/env npx tsx
/**
 * Ship hygiene audit — verifies local pre-push guardrails stay reliable without
 * relying on SKIP_SHIP_CHECK bypasses.
 *
 * Usage: npm run audit:ship-hygiene
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

type AuditResult = { ok: true } | { ok: false; message: string };

const checks: Array<{ name: string; run: () => AuditResult }> = [
  {
    name: "pre-push runs preflight, css-syntax, and full check:ci by default",
    run: () => {
      const hook = read(".githooks/pre-push");
      const preflightIndex = hook.indexOf("check:preflight");
      const cssIndex = hook.indexOf("check:css-syntax");
      const ciIndex = hook.indexOf("check:ci");
      if (preflightIndex < 0 || cssIndex < 0 || ciIndex < 0) {
        return { ok: false, message: ".githooks/pre-push missing required npm scripts" };
      }
      if (!(preflightIndex < cssIndex && cssIndex < ciIndex)) {
        return { ok: false, message: ".githooks/pre-push must run preflight -> css-syntax -> check:ci" };
      }
      return { ok: true };
    },
  },
  {
    name: "theme matrix restarts stale servers on broken CSS bundles",
    run: () => {
      const source = read("scripts/audit-theme-matrix.ts");
      if (!source.includes("assertStylesheetsHealthy")) {
        return { ok: false, message: "audit-theme-matrix.ts missing assertStylesheetsHealthy" };
      }
      if (!source.includes("killListeningPort")) {
        return { ok: false, message: "audit-theme-matrix.ts missing killListeningPort" };
      }
      return { ok: true };
    },
  },
  {
    name: "mobile layout audit restarts stale servers on broken CSS bundles",
    run: () => {
      const source = read("scripts/audit-mobile-layout.ts");
      if (!source.includes("assertStylesheetsHealthy")) {
        return { ok: false, message: "audit-mobile-layout.ts missing assertStylesheetsHealthy" };
      }
      if (!source.includes("killListeningPort")) {
        return { ok: false, message: "audit-mobile-layout.ts missing killListeningPort" };
      }
      return { ok: true };
    },
  },
  {
    name: "citation analytics uses sqlite schema instead of json-only storage",
    run: () => {
      const store = read("src/lib/services/citation-event-store.ts");
      const schema = read("src/lib/services/citation-schema.sql");
      if (!schema.includes("citation_events")) {
        return { ok: false, message: "citation-schema.sql missing citation_events table" };
      }
      if (!store.includes("createSqliteStore")) {
        return { ok: false, message: "citation-event-store.ts missing sqlite store" };
      }
      if (!store.includes("createD1Store")) {
        return { ok: false, message: "citation-event-store.ts missing D1 store" };
      }
      return { ok: true };
    },
  },
  {
    name: "package.json exposes audit:ship-hygiene script",
    run: () => {
      const pkg = read("package.json");
      if (!pkg.includes("audit:ship-hygiene")) {
        return { ok: false, message: "package.json missing audit:ship-hygiene script" };
      }
      return { ok: true };
    },
  },
];

function main(): void {
  const failures: string[] = [];

  for (const check of checks) {
    const result = check.run();
    if (result.ok) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.error(`  ✗ ${check.name}: ${result.message}`);
      failures.push(`${check.name}: ${result.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\nShip hygiene audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nShip hygiene audit passed (${checks.length} checks).`);
}

main();
