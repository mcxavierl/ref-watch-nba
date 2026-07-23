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
        /CLINICAL MODERN STANDARD/,
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
  {
    name: "Clinical Modern design tokens file exists",
    run: () =>
      auditFileContains(
        "figma/design-tokens.json",
        /clinicalModern/,
        "design-tokens.json clinicalModern block",
      ),
  },
  {
    name: "globals.css exposes semantic delta tokens",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /--semantic-positive:\s*#166534/,
        "--semantic-positive Clinical Modern token",
      ),
  },
  {
    name: "StatusBadge component exists with Clinical Modern comment",
    run: () =>
      auditFileContains(
        "src/components/hub/StatusBadge.tsx",
        /CLINICAL MODERN STANDARD.*icon-paired status badges/s,
        "StatusBadge Clinical Modern comment",
      ),
  },
  {
    name: "ProvenanceIndicator component exists",
    run: () =>
      auditFileContains(
        "src/components/hub/ProvenanceIndicator.tsx",
        /ProvenanceIndicator/,
        "ProvenanceIndicator component",
      ),
  },
  {
    name: "ClinicalCard shell exports glass card class",
    run: () =>
      auditFileContains(
        "src/components/hub/ClinicalCard.tsx",
        /backdrop-blur-md/,
        "ClinicalCard backdrop-blur",
      ),
  },
  {
    name: "ProfileSignalsSection uses progressive disclosure",
    run: () =>
      auditFileContains(
        "src/components/ProfileSignalsSection.tsx",
        /profile-signals-details/,
        "profile signals accordion",
      ),
  },
  {
    name: "ProfileSignalsSection uses NotableInsightBadge for notable signals",
    run: () =>
      auditFileContains(
        "src/components/ProfileSignalsSection.tsx",
        /NotableInsightBadge/,
        "NotableInsightBadge in profile signals",
      ),
  },
  {
    name: "SampleGateBadge delegates to StatusBadge",
    run: () =>
      auditFileContains(
        "src/components/SampleGateBadge.tsx",
        /from "@\/components\/hub\/StatusBadge"/,
        "SampleGateBadge StatusBadge import",
      ),
  },
  {
    name: "ClinicalMetricCard shell exists",
    run: () =>
      auditFileContains(
        "src/components/hub/ClinicalMetricCard.tsx",
        /CLINICAL MODERN STANDARD/,
        "ClinicalMetricCard comment",
      ),
  },
  {
    name: "All league hub findings skip league-trend skew card",
    run: () => {
      const leagueFiles = [
        "src/lib/findings.ts",
        "src/lib/nhl/findings.ts",
        "src/lib/nfl/findings.ts",
        "src/lib/epl/findings.ts",
        "src/lib/laliga/findings.ts",
        "src/lib/cbb/findings.ts",
        "src/lib/cfb/findings.ts",
      ];
      const spreadSkip =
        /\.\.\.\(options\?\.hub\s*\?\s*\[\]\s*:\s*\[(?:leagueUnderFinding|buildLeagueSkewFinding)/;
      const inlineSkip =
        /options\?\.hub\s*\?\s*\[\]\s*:\s*\[(?:leagueUnderFinding|buildLeagueSkewFinding)/;
      for (const file of leagueFiles) {
        const content = read(file);
        if (!spreadSkip.test(content) && !inlineSkip.test(content)) {
          return {
            ok: false,
            message: `${file} must skip league skew when options.hub is true`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "RefRankingsTable uses progressive disclosure",
    run: () =>
      auditFileContains(
        "src/components/RefRankingsTable.tsx",
        /ranking-table-details-row/,
        "expandable details row",
      ),
  },
  {
    name: "RefRankingsTable separates row toggle and footer expand classes",
    run: () => {
      const content = read("src/components/RefRankingsTable.tsx");
      if (!content.includes("ranking-table-row-toggle-btn")) {
        return {
          ok: false,
          message: "RefRankingsTable must use ranking-table-row-toggle-btn for row chevrons",
        };
      }
      if (content.includes('className="ranking-table-expand-btn"') &&
          content.match(/ranking-table-expand-btn/g)?.length !== 1) {
        return {
          ok: false,
          message: "RefRankingsTable footer must be the only ranking-table-expand-btn usage",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "RefRankingsTable applies semantic delta coloring",
    run: () =>
      auditFileContains(
        "src/components/RefRankingsTable.tsx",
        /signedDeltaTone/,
        "signedDeltaTone for row metrics",
      ),
  },
  {
    name: "AnchorScrollManager wired in root layout",
    run: () =>
      auditFileContains(
        "src/app/layout.tsx",
        /AnchorScrollManager/,
        "AnchorScrollManager in layout",
      ),
  },
  {
    name: "Single site scroll offset token in globals.css",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /--site-scroll-offset/,
        "--site-scroll-offset token",
      ),
  },
  {
    name: "StatusBadge hub component exists",
    run: () =>
      auditFileContains(
        "src/components/hub/StatusBadge.tsx",
        /CLINICAL MODERN STANDARD/,
        "StatusBadge Clinical Modern comment",
      ),
  },
  {
    name: "ProvenanceIndicator hub component exists",
    run: () =>
      auditFileContains(
        "src/components/hub/ProvenanceIndicator.tsx",
        /provenance-indicator-panel|provenance-indicator-tooltip/,
        "provenance tooltip markup",
      ),
  },
  {
    name: "ProfileSignalsSection uses progressive disclosure",
    run: () =>
      auditFileContains(
        "src/components/ProfileSignalsSection.tsx",
        /profile-signals-details/,
        "profile signals details accordion",
      ),
  },
  {
    name: "ProfileSignalsSection uses NotableInsightBadge for notable signals",
    run: () =>
      auditFileContains(
        "src/components/ProfileSignalsSection.tsx",
        /NotableInsightBadge/,
        "NotableInsightBadge in profile signals",
      ),
  },
  {
    name: "globals.css defines status badge styles",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /\.status-badge--pass/,
        "status badge pass variant",
      ),
  },
  {
    name: "NcaaAuditStatusPill delegates to StatusBadge",
    run: () =>
      auditFileContains(
        "src/components/NcaaAuditStatusPill.tsx",
        /from "@\/components\/hub\/StatusBadge"/,
        "StatusBadge import in NcaaAuditStatusPill",
      ),
  },
  {
    name: "NcaaIntegrityAuditDashboard uses ClinicalMetricCard",
    run: () =>
      auditFileContains(
        "src/components/NcaaIntegrityAuditDashboard.tsx",
        /ClinicalMetricCard/,
        "ClinicalMetricCard in NCAA audit dashboard",
      ),
  },
  {
    name: "College hub pages include ConferenceCoverage",
    run: () => {
      const content = read("src/components/LeagueSlatePage.tsx");
      if (!content.includes("ConferenceCoverage")) {
        return {
          ok: false,
          message: "ConferenceCoverage missing in src/components/LeagueSlatePage.tsx",
        };
      }
      if (!content.includes('leagueId === "cbb"') || !content.includes('leagueId === "cfb"')) {
        return {
          ok: false,
          message: "LeagueSlatePage must gate ConferenceCoverage to CBB and CFB",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "NcaaIntegrityAuditDashboard uses progressive disclosure for failures",
    run: () =>
      auditFileContains(
        "src/components/NcaaIntegrityAuditDashboard.tsx",
        /<details className="ncaa-integrity-audit-failures"/,
        "details accordion for audit failures",
      ),
  },
  {
    name: "GameSlateCard uses Clinical Modern shell",
    run: () =>
      auditFileContains(
        "src/components/GameSlateCard.tsx",
        /CLINICAL_CARD_CLASS/,
        "clinical card on slate cards",
      ),
  },
  {
    name: "GameSlateCard uses inline pace alert copy instead of pace pills",
    run: () =>
      auditFileContains(
        "src/components/GameSlateCard.tsx",
        /font-mono text-xs uppercase tracking-wider text-slate-400/,
        "inline pace alert copy in GameSlateCard",
      ),
  },
  {
    name: "GameSlateCard applies semantic delta coloring",
    run: () =>
      auditFileContains(
        "src/components/GameSlateCard.tsx",
        /signedDeltaTone/,
        "signedDeltaTone in GameSlateCard",
      ),
  },
  {
    name: "TeamPageInsights uses shared InsightCard editorial shell",
    run: () => {
      const content = read("src/components/TeamPageInsights.tsx");
      if (!content.includes("InsightCard") || !content.includes("overview-editorial-narrative")) {
        return {
          ok: false,
          message: "TeamPageInsights must use InsightCard and overview editorial layout",
        };
      }
      if (content.includes("ClinicalCard")) {
        return {
          ok: false,
          message: "TeamPageInsights must not use legacy ClinicalCard insight shell",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "TeamEdgeSummaryCard uses Clinical Modern hub components",
    run: () => {
      const content = read("src/components/team-hub/TeamEdgeSummaryCard.tsx");
      if (!content.includes("ClinicalCard") || !content.includes("StatusBadge")) {
        return {
          ok: false,
          message: "TeamEdgeSummaryCard must use ClinicalCard and StatusBadge",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "WhistlePremiumSection uses StatusBadge",
    run: () =>
      auditFileContains(
        "src/components/WhistlePremiumSection.tsx",
        /StatusBadge/,
        "StatusBadge in WhistlePremiumSection",
      ),
  },
  {
    name: "kpi-data-pill.css defines shared pill glow tokens",
    run: () =>
      auditFileContains(
        "src/styles/kpi-data-pill.css",
        /--pill-glow-accent/,
        "pill glow accent token",
      ),
  },
  {
    name: "globals.css applies ranking signal pill styles",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /\.ranking-signal-pill--stable/,
        "ranking signal pill stable glow",
      ),
  },
  {
    name: "DynamicInsightPill uses shared dynamic-insight-pill class",
    run: () =>
      auditFileContains(
        "src/components/ui/DynamicInsightPill.tsx",
        /dynamic-insight-pill/,
        "dynamic insight pill class",
      ),
  },
  {
    name: "Pill component defines overflow containment utilities",
    run: () =>
      auditFileContains(
        "src/components/ui/Pill.tsx",
        /pill-constrain/,
        "pill constrain utility",
      ),
  },
  {
    name: "pill-constraints.css defines shared pill tokens",
    run: () =>
      auditFileContains(
        "src/styles/pill-constraints.css",
        /--pill-padding-y/,
        "pill padding token",
      ),
  },
  {
    name: "globals.css imports pill-constraints stylesheet",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /pill-constraints\.css/,
        "pill constraints import",
      ),
  },
  {
    name: "Ref master insight pills use Pill wrapper",
    run: () =>
      auditFileContains(
        "src/components/DynamicInsightPill.tsx",
        /<Pill/,
        "Pill in DynamicInsightPill",
      ),
  },
  {
    name: "globals.css imports season-highlights-delight stylesheet",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /season-highlights-delight\.css/,
        "season highlights delight import",
      ),
  },
  {
    name: "FindingCardLayout uses DirectionalDeltaValue for metric details",
    run: () =>
      auditFileContains(
        "src/components/FindingCardLayout.tsx",
        /DirectionalDeltaValue/,
        "directional delta in finding metrics",
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
