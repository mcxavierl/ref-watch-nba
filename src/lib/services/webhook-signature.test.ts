import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_MAX_SKEW_MS,
} from "@/lib/services/webhookSignature";

describe("webhook signature", () => {
  it("signs payload with timestamped HMAC", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const first = signWebhookPayload("secret", payload, 1_700_000_000);
    const second = signWebhookPayload("secret", payload, 1_700_000_000);
    assert.equal(first.signature, second.signature);
    assert.match(first.signature, /^sha256=[a-f0-9]{64}$/);
    assert.equal(first.timestamp, 1_700_000_000);
    assert.notEqual(
      first.signature,
      signWebhookPayload("other", payload, 1_700_000_000).signature,
    );
  });

  it("verifies signatures inside the skew window", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const nowMs = 1_700_000_000_000;
    const { signature, timestamp } = signWebhookPayload("secret", payload, Math.floor(nowMs / 1000));
    const result = verifyWebhookSignature({
      secret: "secret",
      payload,
      signature,
      timestamp,
      nowMs,
    });
    assert.deepEqual(result, { ok: true });
  });

  it("rejects replayed signatures outside the skew window", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const timestampSeconds = 1_700_000_000;
    const { signature } = signWebhookPayload("secret", payload, timestampSeconds);
    const staleNowMs = timestampSeconds * 1000 + WEBHOOK_SIGNATURE_MAX_SKEW_MS + 1_000;
    const result = verifyWebhookSignature({
      secret: "secret",
      payload,
      signature,
      timestamp: timestampSeconds,
      nowMs: staleNowMs,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /skew window/i);
    }
  });

  it("rejects tampered payloads", () => {
    const payload = JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g1" });
    const nowMs = 1_700_000_000_000;
    const { signature, timestamp } = signWebhookPayload("secret", payload, Math.floor(nowMs / 1000));
    const result = verifyWebhookSignature({
      secret: "secret",
      payload: JSON.stringify({ event: "ANOMALY_DETECTED", gameId: "g2" }),
      signature,
      timestamp,
      nowMs,
    });
    assert.equal(result.ok, false);
  });
});
