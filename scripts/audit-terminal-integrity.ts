#!/usr/bin/env npx tsx
/**
 * Terminal integrity audit for Ref Watch ref-profile and matrix surfaces.
 *
 * Guards 4px-grid spacing tokens, tabular numeric alignment, pill padding,
 * and truncation/shrink containment in constrained table layouts.
 *
 * Usage: npm run audit:terminal-integrity
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

const checks: Array<{ name: string; run: () => AuditResult }> = [
  {
    name: "globals.css imports terminal-integrity stylesheet",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /terminal-integrity\.css/,
        "terminal-integrity import",
      ),
  },
  {
    name: "terminal-integrity.css defines matrix alignment rules",
    run: () =>
      auditFileContains(
        "src/components/terminal-integrity.css",
        /\.team-ref-matrix-head > \.team-ref-matrix-head-stat/,
        "matrix head stat alignment",
      ),
  },
  {
    name: "terminal-integrity.css uses 4px-grid spacing tokens",
    run: () => {
      const css = read("src/components/terminal-integrity.css");
      if (!css.includes("var(--space-1)") || !css.includes("var(--space-2)")) {
        return {
          ok: false,
          message: "terminal-integrity.css missing --space-1 or --space-2 tokens",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "terminal-integrity.css defines ref-profile pill padding",
    run: () =>
      auditFileContains(
        "src/components/terminal-integrity.css",
        /\.ref-profile-trend-rate-pill/,
        "ref profile trend pill rules",
      ),
  },
  {
    name: "MatrixRow aligns numeric columns with tabular-nums text-right",
    run: () =>
      auditFileContains(
        "src/components/analytics/MatrixRow.tsx",
        /tabular-nums text-right/,
        "tabular numeric alignment",
      ),
  },
  {
    name: "MatrixRow constrains ref name with truncate and shrink-0",
    run: () => {
      const content = read("src/components/analytics/MatrixRow.tsx");
      if (!content.includes("shrink-0") || !content.includes("truncate")) {
        return {
          ok: false,
          message: "MatrixRow missing shrink-0 or truncate containment",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Matrix filter bar uses whitespace-nowrap px-3 pills",
    run: () =>
      auditFileContains(
        "src/components/analytics/MatrixView.tsx",
        /whitespace-nowrap px-3/,
        "matrix filter pill padding",
      ),
  },
  {
    name: "RefProfileTeamTrends uses pill padding and tabular alignment",
    run: () => {
      const content = read("src/components/ref-profile/RefProfileTeamTrends.tsx");
      if (!content.includes("whitespace-nowrap px-3")) {
        return {
          ok: false,
          message: "RefProfileTeamTrends missing whitespace-nowrap px-3 on rate badge",
        };
      }
      if (!content.includes("tabular-nums text-right")) {
        return {
          ok: false,
          message: "RefProfileTeamTrends missing tabular-nums text-right on record",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "RefProfileTrendCards uses whitespace-nowrap px-3 rate pills",
    run: () =>
      auditFileContains(
        "src/components/ref-profile/RefProfileTrendCards.tsx",
        /whitespace-nowrap px-3/,
        "trend card rate pill padding",
      ),
  },
  {
    name: "RefProfileQuickStatsBar right-aligns numeric values",
    run: () =>
      auditFileContains(
        "src/components/ref-profile/RefProfileQuickStatsBar.tsx",
        /text-right tabular-nums/,
        "quick stat numeric alignment",
      ),
  },
  {
    name: "package.json exposes audit:terminal-integrity script",
    run: () =>
      auditFileContains(
        "package.json",
        /audit:terminal-integrity/,
        "npm audit:terminal-integrity script",
      ),
  },
  {
    name: "constants/colors.ts defines terminal state colors",
    run: () => {
      const content = read("src/constants/colors.ts");
      if (!content.includes("VOLATILE_RED") || !content.includes("STATE_COLOR_CLASS")) {
        return {
          ok: false,
          message: "src/constants/colors.ts missing state color exports",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "theme-tokens.css defines state color CSS variables",
    run: () =>
      auditFileContains(
        "src/styles/theme-tokens.css",
        /--state-volatile/,
        "state color CSS variables",
      ),
  },
  {
    name: "RefProfileNarrativeLayout prioritizes edge stack before depth expand",
    run: () => {
      const content = read("src/components/ref-profile/RefProfileNarrativeLayout.tsx");
      const edgeIdx = content.indexOf("<ScoutingReportEdge");
      const expandIdx = content.indexOf("<RefProfileDepthExpand");
      if (edgeIdx < 0 || expandIdx < 0 || edgeIdx > expandIdx) {
        return {
          ok: false,
          message: "Ref profile layout must render edge stack before depth expand",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Ref profile tables use data-table-num on market impact splits",
    run: () =>
      auditFileContains(
        "src/components/ref-profile/RefProfileMarketImpactPanel.tsx",
        /data-table-num/,
        "market impact table numeric class",
      ),
  },
  {
    name: "DirectionalDeltaValue uses shared KPI tone state colors",
    run: () =>
      auditFileContains(
        "src/components/shared/DirectionalDeltaValue.tsx",
        /kpiToneStateClass/,
        "directional delta state colors",
      ),
  },
  {
    name: "GsniDeltaValue uses shared KPI tone state colors",
    run: () =>
      auditFileContains(
        "src/components/GsniDeltaValue.tsx",
        /kpiToneStateClass/,
        "gsni delta state colors",
      ),
  },
  {
    name: "LeagueTrendsTable uses data-table and data-table-num",
    run: () => {
      const content = read("src/components/LeagueTrendsTable.tsx");
      if (!content.includes("data-table") || !content.includes("data-table-num")) {
        return {
          ok: false,
          message: "LeagueTrendsTable missing data-table or data-table-num",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Mobile ref profile hides master insight pills below md",
    run: () =>
      auditFileContains(
        "src/components/terminal-integrity.css",
        /\.ref-master-insight-pills/,
        "mobile insight pill collapse",
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
    console.error(`\nTerminal integrity audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nTerminal integrity audit passed (${checks.length} checks).`);
}

main();
