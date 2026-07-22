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
    label: "profile recalibration pipeline",
    sources: [
      "src/lib/cron/recalibrateProfiles.ts",
      "src/lib/cron/rolling-ref-metrics.ts",
      "src/lib/cron/ref-team-history-recalibrator.ts",
      "src/lib/cron/autopsy-recalibrate-subscriber.ts",
      "src/lib/services/autopsyRecordStore.ts",
    ],
    tests: [
      "src/lib/cron/recalibrateProfiles.test.ts",
      "src/lib/cron/rolling-ref-metrics.test.ts",
      "src/lib/cron/autopsy-recalibrate-subscriber.test.ts",
    ],
  },
  {
    label: "upcoming slate metadata",
    sources: [
      "src/lib/overview-matchup-insight.ts",
      "src/lib/overview-upcoming-slate.ts",
      "src/lib/overview-slate-shared.ts",
      "src/lib/live-slate-engine.ts",
      "src/lib/use-live-slate.ts",
      "src/app/api/slate/route.ts",
    ],
    tests: [
      "src/lib/overview-matchup-insight.test.ts",
      "src/lib/overview-upcoming-slate.test.ts",
      "src/lib/live-slate-engine.test.ts",
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
    label: "citation analytics store",
    sources: [
      "src/lib/services/citation-event-store.ts",
      "src/lib/services/citation-schema.sql",
      "src/app/api/v1/analytics/citation/route.ts",
    ],
    tests: ["src/lib/intelligence/intelligence-card.test.ts"],
  },
  {
    label: "highlight badges",
    sources: [
      "src/lib/highlight-badge.ts",
      "src/lib/rankings-synthesis.ts",
      "src/lib/highlight-integrity-audit.ts",
      "src/lib/ref-team-matrix.ts",
      "src/lib/game-slate-preview.ts",
      "src/lib/dashboard-hero-highlights.ts",
      "src/lib/finding-copy.ts",
    ],
    tests: [
      "src/lib/highlight-badge.test.ts",
      "src/lib/rankings-synthesis.test.ts",
      "scripts/audit-highlight-integrity.test.ts",
      "src/lib/ref-team-matrix.test.ts",
      "src/lib/finding-copy.test.ts",
      "src/lib/game-slate-preview.test.ts",
      "src/lib/dashboard-hero-highlights.test.ts",
    ],
  },
  {
    label: "rankings table",
    sources: [
      "src/lib/rankings.ts",
      "src/lib/ranking-signal-pattern.ts",
      "src/components/RefRankingsTable.tsx",
    ],
    tests: ["src/lib/rankings.test.ts", "src/lib/anomaly-surface.test.ts"],
  },
  {
    label: "broadcast export",
    sources: ["src/lib/media/on-air-copy.ts"],
    tests: ["src/lib/media/media-card-content.test.ts"],
  },
  {
    label: "theme matrix contrast math",
    sources: ["scripts/lib/contrast-math.ts", "scripts/lib/theme-matrix-browser.ts"],
    tests: ["scripts/lib/contrast-math.test.ts"],
  },
  {
    label: "enterprise API middleware",
    sources: [
      "src/lib/auth/enterprise-api-middleware.ts",
      "src/lib/api/v1/rate-limit.ts",
      "scripts/seed-api-keys.ts",
    ],
    tests: [
      "src/lib/auth/enterprise-api-middleware.test.ts",
      "src/lib/auth/apikey.test.ts",
    ],
  },
  {
    label: "integrity monitor pipeline",
    sources: [
      "src/lib/analytics/anomalyEngine.ts",
      "src/lib/services/anomalyMonitor.ts",
      "src/lib/services/anomalyEvidenceStore.ts",
      "src/lib/services/webhookPayload.ts",
      "src/lib/services/run-anomaly-monitor.ts",
      "src/lib/services/integrityMonitor.ts",
      "src/lib/services/webhookDispatch.ts",
      "src/lib/services/webhookQueue.ts",
      "src/lib/services/webhookSignature.ts",
      "src/lib/services/webhookSecret.ts",
      "src/lib/services/anomaly-schema.sql",
      "src/lib/services/webhook-schema.sql",
      "scripts/lib/post-assignment-ingest.ts",
      "scripts/fetch-assignments.ts",
      "scripts/morning-slate.ts",
      "scripts/nightly-slate.ts",
    ],
    tests: [
      "src/lib/analytics/anomalyEngine.test.ts",
      "src/lib/services/anomaly-monitor.test.ts",
      "src/lib/services/webhook-dispatch.test.ts",
      "src/lib/services/webhook-signature.test.ts",
      "src/lib/services/webhook-secret.test.ts",
      "scripts/audit-integrity-monitor.test.ts",
    ],
  },
  {
    label: "knowledge graph engine",
    sources: [
      "src/lib/graph/schema.ts",
      "src/lib/graph/index.ts",
      "src/lib/graph/queryEngine.ts",
      "src/lib/graph/cache.ts",
    ],
    tests: ["src/lib/graph/graph.test.ts"],
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
