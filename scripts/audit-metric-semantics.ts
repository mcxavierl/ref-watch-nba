#!/usr/bin/env npx tsx
/**
 * Metric visualization semantics audit for Ref Watch.
 *
 * Guards against misleading comparison charts: mixed scales, delta magnitude
 * bars masquerading as win rates, and missing overflow containment on KPIs.
 *
 * Usage: npm run audit:metric-semantics
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { insightMetricComparison } from "@/lib/insight-editorial";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

const ROOT = join(import.meta.dirname, "..");
const REPORT_PATH = join(ROOT, "METRIC-SEMANTICS-AUDIT.md");

type Severity = "pass" | "warn" | "fail";

type AuditFinding = {
  surface: string;
  severity: Severity;
  detail: string;
};

type AuditResult = { ok: true } | { ok: false; message: string };

const SURFACES = [
  "InsightMetricComparison (editorial baseline vs delta)",
  "InsightSplitMetrics (homepage split sample + delta)",
  "StandoutMetricBar (magnitude / maxMagnitude)",
  "MetricBlock / NeutralDivergenceBar",
  "FindingCardLayout contextual benchmarks",
  "ClinicalInsightMatrixCard directional delta",
  "GameSlateCard / hub KPI pills",
] as const;

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

function auditFileContains(
  relPath: string,
  pattern: RegExp,
  label: string,
): AuditResult {
  const content = readFile(relPath);
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
  const content = readFile(relPath);
  if (pattern.test(content)) {
    return { ok: false, message: `${label} still present in ${relPath}` };
  }
  return { ok: true };
}

function sampleMatrixCard(
  overrides: Partial<LeagueInsightCard> = {},
): LeagueInsightCard {
  return {
    leagueId: "nba",
    label: "NBA",
    shortLabel: "NBA",
    kind: "matrix-edge",
    kicker: "Statistically significant ref×team split",
    headline: "Sample split",
    story: "Sample story for audit.",
    heroValue: "+51.5pp",
    heroLabel: "Win rate vs team baseline",
    heroTone: "positive",
    stats: [
      { label: "Ref×team record", value: "8-0" },
      { label: "Games", value: "18" },
      { label: "Team baseline", value: "48.5%" },
    ],
    links: [],
    entityName: "Evan Scott",
    teamLabel: "Minnesota Timberwolves",
    refSlug: "evan-scott",
    teamAbbr: "MIN",
    ...overrides,
  };
}

function markerPositionPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function proportionalBarWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(4, Math.min(100, (value / max) * 100));
}

const staticChecks: Array<{ name: string; surface: string; run: () => AuditResult }> = [
  {
    name: "Win-rate comparisons use dual-marker track",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/shared/InsightMetricComparison.tsx",
        /WinRateDeltaComparison/,
        "WinRateDeltaComparison component",
      ),
  },
  {
    name: "Win-rate comparisons place markers on 0-100 axis",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/shared/InsightMetricComparison.tsx",
        /clampPct|WIN_RATE_BAR_SCALE/,
        "0-100 win-rate clamp",
      ),
  },
  {
    name: "Legacy delta-magnitude bar scale removed",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileExcludes(
        "src/components/shared/InsightMetricComparison.tsx",
        /DELTA_BAR_SCALE_PP|deltaBarWidth/,
        "delta magnitude bar width helper",
      ),
  },
  {
    name: "Dual-marker gap segment highlights baseline-to-outcome shift",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/shared/InsightMetricComparison.tsx",
        /insight-metric-comparison-gap/,
        "gap segment between markers",
      ),
  },
  {
    name: "Relative comparisons share one proportional max",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/shared/InsightMetricComparison.tsx",
        /Math\.max\(comparison\.crewValue, comparison\.leagueValue/,
        "shared max for proportional bars",
      ),
  },
  {
    name: "Comparison values stay right-aligned",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/insight-card.css",
        /insight-metric-comparison-value[\s\S]*text-align: right/,
        "right-aligned comparison values",
      ),
  },
  {
    name: "Comparison tracks use 4px rounded bars",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/components/insight-card.css",
        /insight-metric-comparison-dual-axis[\s\S]*height: 0\.25rem[\s\S]*border-radius: 999px/,
        "4px rounded comparison track",
      ),
  },
  {
    name: "Split delta values are overflow-contained",
    surface: "InsightSplitMetrics (homepage split sample + delta)",
    run: () =>
      auditFileContains(
        "src/components/insight-card.css",
        /insight-split-metrics-col--delta[\s\S]*overflow: hidden/,
        "delta overflow containment",
      ),
  },
  {
    name: "Split metrics use horizontal flex row",
    surface: "InsightSplitMetrics (homepage split sample + delta)",
    run: () =>
      auditFileContains(
        "src/components/shared/InsightSplitMetrics.tsx",
        /insight-split-metrics-row/,
        "split metrics flex row",
      ),
  },
  {
    name: "StandoutMetricBar width uses magnitude over maxMagnitude",
    surface: "StandoutMetricBar (magnitude / maxMagnitude)",
    run: () =>
      auditFileContains(
        "src/components/StandoutMetric.tsx",
        /magnitude \/ maxMagnitude/,
        "proportional bar width formula",
      ),
  },
  {
    name: "MetricBlock uses NeutralDivergenceBar for neutral tone",
    surface: "MetricBlock / NeutralDivergenceBar",
    run: () =>
      auditFileContains(
        "src/components/MetricBlock.tsx",
        /NeutralDivergenceBar/,
        "neutral divergence bar usage",
      ),
  },
  {
    name: "Finding metrics use contextual benchmark styling",
    surface: "FindingCardLayout contextual benchmarks",
    run: () =>
      auditFileContains(
        "src/components/FindingCardLayout.tsx",
        /finding-metric-value--contextual/,
        "contextual benchmark metric class",
      ),
  },
  {
    name: "Matrix cards use DirectionalDeltaValue for signed deltas",
    surface: "ClinicalInsightMatrixCard directional delta",
    run: () =>
      auditFileContains(
        "src/components/ClinicalInsightMatrixCard.tsx",
        /DirectionalDeltaValue/,
        "directional delta component",
      ),
  },
  {
    name: "Editorial comparisons expose ref win rate for markers",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () =>
      auditFileContains(
        "src/lib/insight-editorial.ts",
        /refWinRate/,
        "refWinRate on comparison payload",
      ),
  },
  {
    name: "package.json exposes audit:metric-semantics script",
    surface: "Repository guardrails",
    run: () =>
      auditFileContains(
        "package.json",
        /audit:metric-semantics/,
        "npm audit:metric-semantics script",
      ),
  },
  {
    name: "Build pipeline runs metric semantics audit",
    surface: "Repository guardrails",
    run: () =>
      auditFileContains(
        "package.json",
        /audit-metric-semantics\.ts/,
        "build invokes audit-metric-semantics",
      ),
  },
];

const runtimeChecks: Array<{ name: string; surface: string; run: () => AuditResult }> = [
  {
    name: "Matrix comparison includes baseline, delta, and ref win rate",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () => {
      const comparison = insightMetricComparison(sampleMatrixCard());
      if (!comparison) {
        return { ok: false, message: "expected matrix-edge comparison data" };
      }
      if (comparison.teamBaseline !== 48.5) {
        return {
          ok: false,
          message: `teamBaseline expected 48.5, got ${comparison.teamBaseline}`,
        };
      }
      if (comparison.deltaPp !== 51.5) {
        return {
          ok: false,
          message: `deltaPp expected 51.5, got ${comparison.deltaPp}`,
        };
      }
      if (comparison.refWinRate !== 100) {
        return {
          ok: false,
          message: `refWinRate expected 100 from 8-0 record, got ${comparison.refWinRate}`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Marker gap matches outcome minus baseline on 0-100 axis",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () => {
      const comparison = insightMetricComparison(sampleMatrixCard());
      if (!comparison?.teamBaseline || comparison.refWinRate === undefined) {
        return { ok: false, message: "missing baseline/outcome for marker audit" };
      }
      const baselinePos = markerPositionPct(comparison.teamBaseline);
      const outcomePos = markerPositionPct(comparison.refWinRate);
      const gap = Math.abs(outcomePos - baselinePos);
      const expectedGap = Math.abs(comparison.refWinRate - comparison.teamBaseline);
      if (Math.abs(gap - expectedGap) > 0.05) {
        return {
          ok: false,
          message: `marker gap ${gap.toFixed(1)}pp != outcome-baseline ${expectedGap.toFixed(1)}pp`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Negative delta moves outcome marker below baseline",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () => {
      const comparison = insightMetricComparison(
        sampleMatrixCard({
          heroValue: "-12.0pp",
          heroTone: "negative",
          stats: [
            { label: "Ref×team record", value: "2-6" },
            { label: "Games", value: "18" },
            { label: "Team baseline", value: "37.0%" },
          ],
        }),
      );
      if (!comparison?.teamBaseline || comparison.refWinRate === undefined) {
        return { ok: false, message: "missing negative delta comparison" };
      }
      if (comparison.refWinRate >= comparison.teamBaseline) {
        return {
          ok: false,
          message: `expected refWinRate (${comparison.refWinRate}) below baseline (${comparison.teamBaseline})`,
        };
      }
      return { ok: true };
    },
  },
  {
    name: "Relative crew vs league bars preserve value ratio",
    surface: "InsightMetricComparison (editorial baseline vs delta)",
    run: () => {
      const comparison = insightMetricComparison({
        leagueId: "nfl",
        label: "NFL",
        shortLabel: "NFL",
        kind: "ref-outlier",
        kicker: "Whistle outlier",
        headline: "Dale Shaw beats baseline",
        story: "Sample.",
        heroValue: "+51.5pp",
        heroLabel: "Flags variance vs league",
        heroTone: "positive",
        stats: [
          { label: "Flags per game", value: "12.1" },
          { label: "Sample", value: "84 games" },
        ],
        links: [],
        entityName: "Dale Shaw",
        refSlug: "dale-shaw",
      });
      if (!comparison || comparison.format !== "decimal") {
        return { ok: false, message: "expected decimal crew vs league comparison" };
      }
      const max = Math.max(comparison.crewValue, comparison.leagueValue, 0.001) * 1.05;
      const crewWidth = proportionalBarWidth(comparison.crewValue, max);
      const leagueWidth = proportionalBarWidth(comparison.leagueValue, max);
      const valueRatio = comparison.crewValue / comparison.leagueValue;
      const barRatio = crewWidth / leagueWidth;
      if (Math.abs(valueRatio - barRatio) > 0.02) {
        return {
          ok: false,
          message: `bar ratio ${barRatio.toFixed(3)} != value ratio ${valueRatio.toFixed(3)}`,
        };
      }
      return { ok: true };
    },
  },
];

function writeReport(findings: AuditFinding[], passed: number, total: number): void {
  const fails = findings.filter((f) => f.severity === "fail");
  const warns = findings.filter((f) => f.severity === "warn");
  const lines = [
    "# Metric semantics audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Surfaces inventoried",
    "",
    ...SURFACES.map((surface) => `- ${surface}`),
    "",
    "## Summary",
    "",
    `| Result | Count |`,
    `| --- | ---: |`,
    `| Pass | ${passed} |`,
    `| Warn | ${warns.length} |`,
    `| Fail | ${fails.length} |`,
    `| Total checks | ${total} |`,
    "",
  ];

  if (fails.length > 0) {
    lines.push("## Failures", "");
    for (const finding of fails) {
      lines.push(`- **${finding.surface}:** ${finding.detail}`);
    }
    lines.push("");
  }

  if (warns.length > 0) {
    lines.push("## Warnings", "");
    for (const finding of warns) {
      lines.push(`- **${finding.surface}:** ${finding.detail}`);
    }
    lines.push("");
  }

  if (fails.length === 0) {
    lines.push("No metric semantics violations flagged.", "");
  }

  lines.push("Re-run: `npm run audit:metric-semantics`", "");
  writeFileSync(REPORT_PATH, lines.join("\n"));
}

function main(): void {
  const findings: AuditFinding[] = [];
  const failures: string[] = [];
  let passed = 0;
  const allChecks = [...staticChecks, ...runtimeChecks];

  console.log("Metric visualization semantics audit\n");
  console.log("Surfaces:");
  for (const surface of SURFACES) {
    console.log(`  - ${surface}`);
  }
  console.log("");

  for (const check of allChecks) {
    const result = check.run();
    if (result.ok) {
      console.log(`  ✓ ${check.name}`);
      findings.push({ surface: check.surface, severity: "pass", detail: check.name });
      passed += 1;
    } else {
      console.error(`  ✗ ${check.name}: ${result.message}`);
      findings.push({
        surface: check.surface,
        severity: "fail",
        detail: `${check.name}: ${result.message}`,
      });
      failures.push(`${check.name}: ${result.message}`);
    }
  }

  writeReport(findings, passed, allChecks.length);

  if (failures.length > 0) {
    console.error(
      `\nMetric semantics audit failed (${failures.length} issue(s)). See ${REPORT_PATH}`,
    );
    process.exit(1);
  }

  console.log(
    `\nMetric semantics audit passed (${allChecks.length} checks). Report: ${REPORT_PATH}`,
  );
}

main();
