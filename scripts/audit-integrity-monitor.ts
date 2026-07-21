#!/usr/bin/env npx tsx
/**
 * Integrity monitor audit for anomaly detection and webhook dispatch guardrails.
 *
 * Usage: npm run audit:integrity-monitor
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
    name: "anomaly monitor defines z-score and line lag thresholds",
    run: () => {
      const content = read("src/lib/services/anomalyMonitor.ts");
      if (!content.includes("CREW_DISPARITY_Z_THRESHOLD")) {
        return { ok: false, message: "anomalyMonitor.ts missing CREW_DISPARITY_Z_THRESHOLD" };
      }
      if (!content.includes("LINE_LAG_POINTS_THRESHOLD")) {
        return { ok: false, message: "anomalyMonitor.ts missing LINE_LAG_POINTS_THRESHOLD" };
      }
      return { ok: true };
    },
  },
  {
    name: "anomaly monitor emits ANOMALY_DETECTED events",
    run: () =>
      auditFileContains(
        "src/lib/services/anomalyMonitor.ts",
        /event:\s*"ANOMALY_DETECTED"/,
        "ANOMALY_DETECTED event envelope",
      ),
  },
  {
    name: "webhook dispatch signs payloads and applies backoff",
    run: () => {
      const dispatch = read("src/lib/services/webhookDispatch.ts");
      if (!dispatch.includes("computeWebhookBackoffMs")) {
        return { ok: false, message: "webhookDispatch.ts missing computeWebhookBackoffMs" };
      }
      const queue = read("src/lib/services/webhookQueue.ts");
      if (!queue.includes("signWebhookPayload")) {
        return { ok: false, message: "webhookQueue.ts missing signWebhookPayload" };
      }
      return { ok: true };
    },
  },
  {
    name: "integrity monitor pipeline writes anomaly artifact",
    run: () =>
      auditFileContains(
        "src/lib/services/anomalyMonitor.ts",
        /writeAnomalyMonitorArtifact/,
        "writeAnomalyMonitorArtifact call",
      ),
  },
  {
    name: "morning slate runs integrity monitor after assignment ingest",
    run: () =>
      auditFileContains(
        "scripts/morning-slate.ts",
        /runIntegrityMonitorPipeline/,
        "runIntegrityMonitorPipeline hook",
      ),
  },
  {
    name: "nightly slate runs integrity monitor after assignment ingest",
    run: () =>
      auditFileContains(
        "scripts/nightly-slate.ts",
        /runIntegrityMonitorPipeline/,
        "runIntegrityMonitorPipeline hook",
      ),
  },
  {
    name: "webhook schema defines queue and subscriber tables",
    run: () => {
      const schema = read("src/lib/services/webhook-schema.sql");
      if (!schema.includes("webhook_subscribers") || !schema.includes("webhook_queue")) {
        return { ok: false, message: "webhook-schema.sql missing queue tables" };
      }
      return { ok: true };
    },
  },
  {
    name: "integrity monitor unit test file exists",
    run: () =>
      auditFileContains(
        "src/lib/services/anomaly-monitor.test.ts",
        /detectAnomaliesFromSlateMetrics/,
        "anomaly monitor unit test",
      ),
  },
  {
    name: "assignment fetch scripts trigger anomaly monitor on ingest",
    run: () => {
      for (const relPath of [
        "scripts/fetch-assignments.ts",
        "scripts/wnba/fetch-assignments.ts",
        "scripts/nfl/fetch-assignments.ts",
      ]) {
        const result = auditFileContains(
          relPath,
          /postAssignmentIngest/,
          "postAssignmentIngest hook",
        );
        if (!result.ok) return result;
      }
      return { ok: true };
    },
  },
  {
    name: "anomaly monitor exposes onAssignmentsIngested worker",
    run: () =>
      auditFileContains(
        "src/lib/services/anomalyMonitor.ts",
        /onAssignmentsIngested/,
        "onAssignmentsIngested worker",
      ),
  },
  {
    name: "package.json exposes audit:integrity-monitor script",
    run: () =>
      auditFileContains("package.json", /audit:integrity-monitor/, "npm audit:integrity-monitor script"),
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
    console.error(`\nIntegrity monitor audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nIntegrity monitor audit passed (${checks.length} checks).`);
}

main();
