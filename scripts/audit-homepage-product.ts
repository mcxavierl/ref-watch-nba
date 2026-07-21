#!/usr/bin/env npx tsx
/**
 * Homepage product-surface audit — enforces the current slate-first dashboard
 * and prevents accidental partial imports of deferred dual-narrative PR work.
 *
 * Usage: npm run audit:homepage-product
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const DEFERRED_DUAL_NARRATIVE_IMPORTS = [
  "TodaysBiggestEdge",
  "IntelligenceFeedTicker",
  "TheDatasetMoat",
  "TopStatisticalSignals",
  "WhyRefWatchExplainability",
] as const;

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

type AuditResult = { ok: true } | { ok: false; message: string };

const checks: Array<{ name: string; run: () => AuditResult }> = [
  {
    name: "OverviewDashboard keeps slate-first homepage surface",
    run: () => {
      const source = read("src/components/OverviewDashboard.tsx");
      if (!source.includes("OverviewUpcomingSlateSection")) {
        return { ok: false, message: "OverviewDashboard missing OverviewUpcomingSlateSection" };
      }
      if (!source.includes('placement="primary"')) {
        return { ok: false, message: "OverviewDashboard missing primary LeagueChooser placement" };
      }
      for (const symbol of DEFERRED_DUAL_NARRATIVE_IMPORTS) {
        if (source.includes(symbol)) {
          return {
            ok: false,
            message: `OverviewDashboard must not import deferred dual-narrative component ${symbol}`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "homepage entry uses OverviewDashboard shell",
    run: () => {
      const page = read("src/app/page.tsx");
      if (!page.includes("OverviewDashboard")) {
        return { ok: false, message: "src/app/page.tsx must render OverviewDashboard" };
      }
      for (const symbol of DEFERRED_DUAL_NARRATIVE_IMPORTS) {
        if (page.includes(symbol)) {
          return {
            ok: false,
            message: `src/app/page.tsx must not import deferred dual-narrative component ${symbol}`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "dual-narrative builders stay available for future integration",
    run: () => {
      const lib = read("src/lib/homepage-dual-narrative.ts");
      if (!lib.includes("buildTodaysBiggestEdgeView")) {
        return { ok: false, message: "homepage-dual-narrative.ts missing buildTodaysBiggestEdgeView" };
      }
      if (!lib.includes("buildHomepageIntelligenceTickerItems")) {
        return {
          ok: false,
          message: "homepage-dual-narrative.ts missing buildHomepageIntelligenceTickerItems",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "package.json exposes audit:homepage-product script",
    run: () => {
      const pkg = read("package.json");
      if (!pkg.includes("audit:homepage-product")) {
        return { ok: false, message: "package.json missing audit:homepage-product script" };
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
    console.error(`\nHomepage product audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nHomepage product audit passed (${checks.length} checks).`);
}

main();
