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
    name: "rolling anomaly engine defines types and severity model",
    run: () => {
      const engine = read("src/lib/analytics/anomalyEngine.ts");
      if (!engine.includes("CREW_FOUL_DEVIATION")) {
        return { ok: false, message: "anomalyEngine.ts missing CREW_FOUL_DEVIATION" };
      }
      if (!engine.includes("computeSeverityScore")) {
        return { ok: false, message: "anomalyEngine.ts missing computeSeverityScore" };
      }
      return { ok: true };
    },
  },
  {
    name: "anomaly evidence store schema exists",
    run: () =>
      auditFileContains(
        "src/lib/services/anomaly-schema.sql",
        /anomaly_evidence_store/,
        "anomaly_evidence_store table",
      ),
  },
  {
    name: "webhook dispatch signs payloads and applies backoff",
    run: () => {
      const dispatch = read("src/lib/services/webhookDispatch.ts");
      if (!dispatch.includes("computeWebhookBackoffMs")) {
        return { ok: false, message: "webhookDispatch.ts missing computeWebhookBackoffMs" };
      }
      if (!dispatch.includes("WEBHOOK_SIGNATURE_HEADER")) {
        return { ok: false, message: "webhookDispatch.ts missing WEBHOOK_SIGNATURE_HEADER" };
      }
      if (!dispatch.includes("WEBHOOK_TIMESTAMP_HEADER")) {
        return { ok: false, message: "webhookDispatch.ts missing WEBHOOK_TIMESTAMP_HEADER" };
      }
      const signature = read("src/lib/services/webhookSignature.ts");
      if (!signature.includes("verifyWebhookSignature")) {
        return { ok: false, message: "webhookSignature.ts missing verifyWebhookSignature" };
      }
      if (!signature.includes("WEBHOOK_SIGNATURE_MAX_SKEW_MS")) {
        return { ok: false, message: "webhookSignature.ts missing replay skew window" };
      }
      const queue = read("src/lib/services/webhookQueue.ts");
      if (!queue.includes("signWebhookPayload")) {
        return { ok: false, message: "webhookQueue.ts missing signWebhookPayload export" };
      }
      if (!signature.includes("sha256=")) {
        return { ok: false, message: "webhookSignature.ts missing sha256= signature prefix" };
      }
      return { ok: true };
    },
  },
  {
    name: "webhook subscriber secrets are sealed at rest",
    run: () => {
      const secret = read("src/lib/services/webhookSecret.ts");
      if (!secret.includes("sealWebhookSecret")) {
        return { ok: false, message: "webhookSecret.ts missing sealWebhookSecret" };
      }
      const queue = read("src/lib/services/webhookQueue.ts");
      if (!queue.includes("normalizeWebhookSecretForStorage")) {
        return { ok: false, message: "webhookQueue.ts missing normalizeWebhookSecretForStorage on upsert" };
      }
      return { ok: true };
    },
  },
  {
    name: "anomaly monitor persists evidence before webhook dispatch",
    run: () =>
      auditFileContains(
        "src/lib/services/anomalyMonitor.ts",
        /persistAnomalyEvidence/,
        "persistAnomalyEvidence call",
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
      if (!schema.includes("webhook_events")) {
        return { ok: false, message: "webhook-schema.sql missing webhook_events table" };
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
