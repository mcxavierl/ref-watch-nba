import { randomUUID } from "node:crypto";
import type { DetectedAnomaly } from "@/lib/analytics/anomalyEngine";
import type { AnomalySeverity } from "@/lib/services/anomalyMonitor";

export const WEBHOOK_PAYLOAD_VERSION = "1.0";

export type WebhookEventType =
  | "ANOMALY_DETECTED"
  | "GAME_ASSIGNMENT_CREATED"
  | "PROJECTION_UPDATED"
  | "MODEL_CONFIDENCE_CHANGED"
  | "POST_GAME_REVIEW_AVAILABLE";

export type EnterpriseWebhookPayload = {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  version: typeof WEBHOOK_PAYLOAD_VERSION;
  game: { id: string };
  severity: "INFO" | "HIGH" | "CRITICAL";
  anomaly?: {
    type: string;
    score: number;
  };
  evidence: Record<string, unknown>;
};

function mapSeverity(level: DetectedAnomaly["severityLevel"]): EnterpriseWebhookPayload["severity"] {
  return level;
}

function legacySeverity(level: DetectedAnomaly["severityLevel"]): AnomalySeverity {
  return level === "CRITICAL" ? "CRITICAL" : "HIGH";
}

export function buildAnomalyWebhookPayload(
  anomaly: DetectedAnomaly,
  timestamp = new Date().toISOString(),
): EnterpriseWebhookPayload {
  return {
    id: `evt_${randomUUID()}`,
    event: "ANOMALY_DETECTED",
    timestamp,
    version: WEBHOOK_PAYLOAD_VERSION,
    game: { id: anomaly.gameId },
    severity: mapSeverity(anomaly.severityLevel),
    anomaly: {
      type: anomaly.type,
      score: anomaly.severityScore,
    },
    evidence: {
      ...anomaly.evidence,
      zScore: anomaly.zScore,
      sampleSize: anomaly.evidence.sampleSize,
      rollingWindowUsed: anomaly.rollingWindowUsed,
      summary: anomaly.summary,
      leagueId: anomaly.leagueId,
    },
  };
}

export function buildAnomalyWebhookPayloads(
  anomalies: DetectedAnomaly[],
  timestamp = new Date().toISOString(),
): EnterpriseWebhookPayload[] {
  return anomalies.map((anomaly) => buildAnomalyWebhookPayload(anomaly, timestamp));
}

export { legacySeverity };
