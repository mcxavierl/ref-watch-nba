import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREW_DISPARITY_Z_THRESHOLD,
  LINE_LAG_POINTS_THRESHOLD,
  classifyAnomalySeverity,
  detectAnomaliesFromSlateMetrics,
  type SlateGameMetrics,
} from "@/lib/services/anomalyMonitor";
import { computeWebhookBackoffMs } from "@/lib/services/webhookDispatch";
import { signWebhookPayload } from "@/lib/services/webhookQueue";
import { verifyWebhookSignature } from "@/lib/services/webhookSignature";

function metric(
  id: string,
  crewDelta: number,
  lineLag: number,
): SlateGameMetrics {
  return {
    game: {
      id,
      matchup: "AWY @ HOM",
      awayTeam: "Away",
      homeTeam: "Home",
      league: "NBA",
      crew: [
        { name: "Scott Foster", number: 48, role: "crew_chief" },
        { name: "Tony Brothers", number: 25, role: "referee" },
      ],
    },
    crewDelta,
    lineLag,
    crewAvgTotal: 230,
    benchmarkTotal: 225,
    sampleGames: 120,
    qualifiedRefCount: 2,
  };
}

describe("anomaly monitor", () => {
  it("flags crew disparity when z-score exceeds threshold", () => {
    const metrics = [
      metric("g1", -0.1, 1.0),
      metric("g2", 0.0, 0.5),
      metric("g3", 0.1, 0.2),
      metric("g4", -0.1, 0.4),
      metric("g5", 0.0, 0.3),
      metric("g6", 0.1, 0.2),
      metric("g7", -0.1, 0.1),
      metric("g8", 0.0, 0.2),
      metric("g9", 0.1, 0.1),
      metric("g10", 5.0, 0.5),
    ];
    const events = detectAnomaliesFromSlateMetrics("nba", metrics);
    assert.ok(events.length >= 1);
    const flagged = events.find((event) => event.gameId === "g10");
    assert.ok(flagged);
    assert.ok(flagged.evidence.kinds.includes("crew_disparity"));
    assert.ok(
      (flagged.evidence.crewDeltaZScore ?? 0) > CREW_DISPARITY_Z_THRESHOLD,
    );
  });

  it("flags line lag above pacing threshold", () => {
    const events = detectAnomaliesFromSlateMetrics("nba", [
      metric("g1", 1.0, 5.2),
      metric("g2", 0.5, 0.4),
      metric("g3", 0.2, 0.1),
    ]);
    const flagged = events.find((event) => event.gameId === "g1");
    assert.ok(flagged);
    assert.ok(flagged.evidence.kinds.includes("line_lag"));
    assert.ok(Math.abs(flagged.evidence.lineLag) > LINE_LAG_POINTS_THRESHOLD);
  });

  it("classifies critical when both signals fire", () => {
    const severity = classifyAnomalySeverity({
      crewDeltaZScore: 3.8,
      lineLag: 6.2,
      crewDisparityFlag: true,
      lineLagFlag: true,
    });
    assert.equal(severity, "CRITICAL");
  });
});

describe("anomaly monitor worker", () => {
  it("exposes onAssignmentsIngested entry point for assignment ingest hooks", async () => {
    const { onAssignmentsIngested } = await import("@/lib/services/anomalyMonitor");
    assert.equal(typeof onAssignmentsIngested, "function");
  });
});

describe("webhook dispatch", () => {
  it("computes fixed enterprise retry delays", () => {
    assert.equal(computeWebhookBackoffMs(0), 0);
    assert.equal(computeWebhookBackoffMs(1), 30_000);
    assert.equal(computeWebhookBackoffMs(2), 120_000);
    assert.equal(computeWebhookBackoffMs(3), 600_000);
    assert.equal(computeWebhookBackoffMs(4), 3_600_000);
  });

  it("signs webhook payloads with sha256 prefix", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const timestamp = 1_700_000_000;
    const a = signWebhookPayload("secret", payload, timestamp);
    const b = signWebhookPayload("secret", payload, timestamp);
    assert.equal(a, b);
    assert.match(a, /^sha256=[a-f0-9]{64}$/);
    assert.notEqual(a, signWebhookPayload("other", payload, timestamp));
  });

  it("rejects replayed webhook signatures outside the skew window", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const timestamp = 1_700_000_000;
    const signature = signWebhookPayload("secret", payload, timestamp);
    const result = verifyWebhookSignature({
      secret: "secret",
      payload,
      signature,
      timestamp,
      nowMs: timestamp * 1000 + 6 * 60 * 1000,
    });
    assert.equal(result.ok, false);
  });
});
