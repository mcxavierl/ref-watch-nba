#!/usr/bin/env npx tsx
/**
 * Clinical Modern card consistency audit for Ref Watch league hubs.
 *
 * Checks tabular-nums usage, shared ref-card classes, EPL hub findings config,
 * and over-rate outlier metric layout.
 *
 * Usage: npm run audit:card-consistency
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

type AuditResult = { ok: true } | { ok: false; message: string };

function auditFileContains(
  relPath: string,
  pattern: RegExp,
  label: string,
): AuditResult {
  const content = read(relPath);
  if (!pattern.test(content)) {
    return { ok: false, message: `${label} missing in ${relPath}` };
  }
  return { ok: true };
}

function auditFileExcludes(
  relPath: string,
  pattern: RegExp,
  label: string,
): AuditResult {
  const content = read(relPath);
  if (pattern.test(content)) {
    return { ok: false, message: `${label} still present in ${relPath}` };
  }
  return { ok: true };
}

const checks: Array<{ name: string; run: () => AuditResult }> = [
  {
    name: "RefCard documents Clinical Modern standard",
    run: () =>
      auditFileContains(
        "src/components/hub/RefCard.tsx",
        /Clinical Modern ref card standard/,
        "Clinical Modern doc comment",
      ),
  },
  {
    name: "RefCard exports tabular-nums metric class",
    run: () =>
      auditFileContains(
        "src/components/hub/RefCard.tsx",
        /tabular-nums/,
        "tabular-nums on ref-card metrics",
      ),
  },
  {
    name: "FindingMetricsGrid applies tabular-nums",
    run: () =>
      auditFileContains(
        "src/components/FindingCardLayout.tsx",
        /finding-metric-value.*tabular-nums|tabular-nums.*finding-metric-value/,
        "tabular-nums on finding metric values",
      ),
  },
  {
    name: "FindingMetricsGrid uses contextual benchmark styling",
    run: () =>
      auditFileContains(
        "src/components/FindingCardLayout.tsx",
        /finding-metric-value--contextual/,
        "contextual benchmark metric class",
      ),
  },
  {
    name: "HighlightStatCard uses RefCard wrapper",
    run: () =>
      auditFileContains(
        "src/components/HighlightStatCard.tsx",
        /from "@\/components\/hub\/RefCard"/,
        "RefCard import",
      ),
  },
  {
    name: "HighlightStatCard uses Clinical Modern classes",
    run: () =>
      auditFileContains(
        "src/components/HighlightStatCard.tsx",
        /REF_CARD_CLASS|RefCard/,
        "RefCard component usage",
      ),
  },
  {
    name: "globals.css defines contextual finding metric styles",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /finding-metric-value--contextual/,
        "contextual metric CSS",
      ),
  },
  {
    name: "globals.css defines muted sub-metric detail styles",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /finding-metric-detail--muted/,
        "muted detail CSS",
      ),
  },
  {
    name: "metric-delight treats benchmark stats as neutral",
    run: () =>
      auditFileContains(
        "src/lib/metric-delight.ts",
        /isContextualBenchmarkStat/,
        "isContextualBenchmarkStat helper",
      ),
  },
  {
    name: "EPL hub mode excludes league-trend skew card",
    run: () => {
      const content = read("src/lib/epl/findings.ts");
      const hubGuard =
        /options\?\.hub\s*\?\s*\[\]\s*:\s*\[buildLeagueSkewFinding/.test(content);
      if (!hubGuard) {
        return {
          ok: false,
          message:
            "EPL collectCandidates must skip buildLeagueSkewFinding when options.hub is true",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Over-rate outlier uses two-metric Clinical Modern layout",
    run: () => {
      const content = read("src/lib/findings-builders.ts");
      const fnMatch = content.match(
        /export function buildOverRateOutlierFinding[\s\S]*?sampleGames: ref\.games,\s*\};\s*\}/,
      );
      if (!fnMatch) {
        return {
          ok: false,
          message: "buildOverRateOutlierFinding not found",
        };
      }
      const fnBody = fnMatch[0];
      if (!fnBody.includes('"Delta vs baseline"')) {
        return {
          ok: false,
          message: "buildOverRateOutlierFinding missing Delta vs baseline stat",
        };
      }
      if (fnBody.includes('"Delta vs 50%"')) {
        return {
          ok: false,
          message: "buildOverRateOutlierFinding still uses legacy Delta vs 50% stat",
        };
      }
      const statsBlock = fnBody.match(/stats:\s*\[([\s\S]*?)\],/)?.[1] ?? "";
      const statBlocks = statsBlock.match(/\{\s*label:/g)?.length ?? 0;
      if (statBlocks !== 2) {
        return {
          ok: false,
          message: `buildOverRateOutlierFinding expected 2 stats, found ${statBlocks}`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "package.json exposes audit:card-consistency script",
    run: () =>
      auditFileContains(
        "package.json",
        /audit:card-consistency/,
        "npm audit:card-consistency script",
      ),
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
    console.error(`\nCard consistency audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nCard consistency audit passed (${checks.length} checks).`);
}

main();
