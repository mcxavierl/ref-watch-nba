#!/usr/bin/env npx tsx
/**
 * Guardrail: when high-churn logic changes, at least one related test file must change too.
 * Catches stale assertions before merge (e.g. slate metadata copy refactors).
 */
import { execSync } from "node:child_process";

type CouplingRule = {
  label: string;
  sources: string[];
  tests: string[];
};

export const COUPLED_TEST_RULES: CouplingRule[] = [
  {
    label: "upcoming slate metadata",
    sources: [
      "src/lib/overview-matchup-insight.ts",
      "src/lib/overview-upcoming-slate.ts",
      "src/lib/overview-slate-shared.ts",
    ],
    tests: [
      "src/lib/overview-matchup-insight.test.ts",
      "src/lib/overview-upcoming-slate.test.ts",
      "src/lib/clinical-modern-surfaces.test.ts",
    ],
  },
  {
    label: "cross-league overview cards",
    sources: ["src/lib/cross-league-overview.ts"],
    tests: [
      "src/lib/soccer-card-metrics.test.ts",
      "src/lib/league-quick-lists.test.ts",
      "src/lib/clinical-modern-surfaces.test.ts",
    ],
  },
  {
    label: "deploy ref-stats asset verify",
    sources: [
      "scripts/verify-production-deploy.ts",
      "scripts/check-deploy-readiness.ts",
      "scripts/lib/verify-ref-stats-asset.ts",
    ],
    tests: [
      "scripts/lib/verify-ref-stats-asset.test.ts",
      "scripts/verify-production-deploy.test.ts",
    ],
  },
  {
    label: "homepage insight methodology gates",
    sources: [
      "src/lib/homepage-insight-gates.ts",
      "src/config/methodology.ts",
      "src/lib/insight-editorial.ts",
    ],
    tests: ["src/lib/homepage-insight-gates.test.ts"],
  },
  {
    label: "integrity monitor pipeline",
    sources: [
      "src/lib/services/anomalyMonitor.ts",
      "src/lib/services/run-anomaly-monitor.ts",
      "src/lib/services/integrityMonitor.ts",
      "src/lib/services/webhookDispatch.ts",
      "src/lib/services/webhookQueue.ts",
      "scripts/lib/post-assignment-ingest.ts",
      "scripts/fetch-assignments.ts",
      "scripts/morning-slate.ts",
      "scripts/nightly-slate.ts",
    ],
    tests: [
      "src/lib/services/anomaly-monitor.test.ts",
      "src/lib/services/webhook-dispatch.test.ts",
      "scripts/audit-integrity-monitor.test.ts",
    ],
  },
];

function gitLines(args: string): string[] {
  try {
    return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): Set<string> {
  const base = process.env.GITHUB_BASE_SHA ?? "origin/main";
  const fromMergeBase = gitLines(`diff --name-only ${base}...HEAD`);
  if (fromMergeBase.length > 0) return new Set(fromMergeBase);

  const staged = gitLines("diff --name-only --cached");
  const unstaged = gitLines("diff --name-only");
  const untracked = gitLines("ls-files --others --exclude-standard");
  return new Set([...staged, ...unstaged, ...untracked]);
}

const changed = changedFiles();
const failures: string[] = [];

for (const rule of COUPLED_TEST_RULES) {
  const touchedSources = rule.sources.filter((file) => changed.has(file));
  if (touchedSources.length === 0) continue;

  const touchedTests = rule.tests.filter((file) => changed.has(file));
  if (touchedTests.length === 0) {
    failures.push(
      `${rule.label}: changed ${touchedSources.join(", ")} but no related test updated (${rule.tests.join(", ")})`,
    );
  }
}

if (failures.length > 0) {
  console.error("check-coupled-test-changes FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  console.error(
    "\nUpdate or add tests when behavior changes. Run `npm run check:ci` before pushing.",
  );
  process.exit(1);
}

console.log(`check-coupled-test-changes: OK (${changed.size} changed file(s) scanned)`);
