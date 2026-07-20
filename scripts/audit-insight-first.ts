#!/usr/bin/env npx tsx
/**
 * Insight-first audit for Ref Watch narrative intelligence surfaces.
 *
 * Guards behavioral headlines, anomaly variance gates, Narrative Intelligence
 * ref-profile layout, and anomalies-only filters on rankings and GSNI.
 *
 * Usage: npm run audit:insight-first
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const LEAGUE_REF_PROFILE_PAGES = [
  "src/lib/league-pages/nba-ref-profile.tsx",
  "src/lib/league-pages/wnba-ref-profile.tsx",
  "src/lib/league-pages/nhl-ref-profile.tsx",
  "src/lib/league-pages/nfl-ref-profile.tsx",
  "src/lib/league-pages/epl-ref-profile.tsx",
  "src/lib/league-pages/laliga-ref-profile.tsx",
  "src/lib/league-pages/cbb-ref-profile.tsx",
  "src/lib/league-pages/cfb-ref-profile.tsx",
] as const;

const LEAGUE_FINDINGS_MODULES = [
  "src/lib/findings.ts",
  "src/lib/findings-market.ts",
  "src/lib/cbb/findings.ts",
  "src/lib/cfb/findings.ts",
  "src/lib/epl/findings.ts",
  "src/lib/laliga/findings.ts",
  "src/lib/nfl/findings.ts",
  "src/lib/nhl/findings.ts",
] as const;

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
    name: "insight-headlines exports behavioral ATS and scoring helpers",
    run: () => {
      const content = read("src/lib/insight-headlines.ts");
      if (!content.includes("atsOutlierHeadline")) {
        return { ok: false, message: "insight-headlines.ts missing atsOutlierHeadline" };
      }
      if (!content.includes("scoringPaceInsight")) {
        return { ok: false, message: "insight-headlines.ts missing scoringPaceInsight" };
      }
      if (!content.includes("whistleInflationHeadline")) {
        return { ok: false, message: "insight-headlines.ts missing whistleInflationHeadline" };
      }
      return { ok: true };
    },
  },
  {
    name: "anomaly-surface defines variance gate and ref anomaly helper",
    run: () => {
      const content = read("src/lib/anomaly-surface.ts");
      if (!content.includes("ANOMALY_VARIANCE_THRESHOLD")) {
        return { ok: false, message: "anomaly-surface.ts missing ANOMALY_VARIANCE_THRESHOLD" };
      }
      if (!content.includes("qualifiesRefAnomaly")) {
        return { ok: false, message: "anomaly-surface.ts missing qualifiesRefAnomaly" };
      }
      if (!content.includes("NO_ANOMALIES_DETECTED_COPY")) {
        return { ok: false, message: "anomaly-surface.ts missing NO_ANOMALIES_DETECTED_COPY" };
      }
      return { ok: true };
    },
  },
  {
    name: "profile-signals uses insight-headlines for behavioral copy",
    run: () =>
      auditFileContains(
        "src/lib/profile-signals.ts",
        /from "@\/lib\/insight-headlines"/,
        "insight-headlines import",
      ),
  },
  {
    name: "RefProfileNarrativeLayout wires officiating bias and market impact",
    run: () => {
      const content = read("src/components/ref-profile/RefProfileNarrativeLayout.tsx");
      if (!content.includes("RefProfileOfficiatingBiasSection")) {
        return {
          ok: false,
          message: "RefProfileNarrativeLayout missing OfficiatingBiasSection",
        };
      }
      if (!content.includes("RefProfileMarketImpactPanel")) {
        return {
          ok: false,
          message: "RefProfileNarrativeLayout missing MarketImpactPanel",
        };
      }
      if (!content.includes("ref-narrative-layout")) {
        return {
          ok: false,
          message: "RefProfileNarrativeLayout missing ref-narrative-layout shell",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "league ref profile pages use RefProfileNarrativeLayout",
    run: () => {
      for (const relPath of LEAGUE_REF_PROFILE_PAGES) {
        const content = read(relPath);
        if (!content.includes("RefProfileNarrativeLayout")) {
          return {
            ok: false,
            message: `${relPath} must render RefProfileNarrativeLayout`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "globals.css defines narrative layout grid tokens",
    run: () =>
      auditFileContains(
        "src/app/globals.css",
        /\.ref-narrative-layout/,
        "ref-narrative-layout styles",
      ),
  },
  {
    name: "league findings use atsOutlierHeadline for ATS outliers",
    run: () => {
      for (const relPath of LEAGUE_FINDINGS_MODULES) {
        const content = read(relPath);
        if (!content.includes("atsOutlierHeadline")) {
          return {
            ok: false,
            message: `${relPath} must use atsOutlierHeadline`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "RefRankingsTable gates anomalies with qualifiesRefAnomaly",
    run: () => {
      const content = read("src/components/RefRankingsTable.tsx");
      if (!content.includes("qualifiesRefAnomaly")) {
        return {
          ok: false,
          message: "RefRankingsTable missing qualifiesRefAnomaly gate",
        };
      }
      if (!content.includes("Anomalies only")) {
        return {
          ok: false,
          message: "RefRankingsTable missing Anomalies only filter",
        };
      }
      if (!content.includes("NO_ANOMALIES_DETECTED_COPY")) {
        return {
          ok: false,
          message: "RefRankingsTable missing empty-state copy",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "GameStateIndexDashboard exposes anomalies-only filter",
    run: () => {
      const content = read("src/components/GameStateIndexDashboard.tsx");
      if (!content.includes("Anomalies only")) {
        return {
          ok: false,
          message: "GameStateIndexDashboard missing Anomalies only filter",
        };
      }
      if (!content.includes("NO_ANOMALIES_DETECTED_COPY")) {
        return {
          ok: false,
          message: "GameStateIndexDashboard missing empty-state copy",
        };
      }
      return { ok: true };
    },
  },
  {
    name: "RefBettingProfile is deprecated in favor of narrative layout",
    run: () =>
      auditFileContains(
        "src/components/RefBettingProfile.tsx",
        /@deprecated Use RefProfileMarketImpactPanel/,
        "RefBettingProfile deprecation notice",
      ),
  },
  {
    name: "package.json exposes audit:insight-first script",
    run: () =>
      auditFileContains(
        "package.json",
        /audit:insight-first/,
        "npm audit:insight-first script",
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
    console.error(`\nInsight-first audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nInsight-first audit passed (${checks.length} checks).`);
}

main();
