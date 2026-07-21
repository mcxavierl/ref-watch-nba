import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_SIGNATURE_HEADER = "X-RefWatch-Signature";
export const WEBHOOK_TIMESTAMP_HEADER = "X-RefWatch-Timestamp";
export const WEBHOOK_SIGNATURE_MAX_SKEW_MS = 5 * 60 * 1000;

export type WebhookSignatureVerification =
  | { ok: true }
  | { ok: false; reason: string };

function parseSignatureHeader(signature: string): Buffer | null {
  const trimmed = signature.trim();
  const match = /^sha256=([a-f0-9]{64})$/i.exec(trimmed);
  if (!match?.[1]) return null;
  return Buffer.from(match[1], "hex");
}

function parseTimestampHeader(timestamp: string | number): number | null {
  const value = typeof timestamp === "number" ? timestamp : Number.parseInt(String(timestamp).trim(), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function buildWebhookSignedPayload(timestampSeconds: number, payload: string): string {
  return `${timestampSeconds}.${payload}`;
}

export function signWebhookPayload(
  secret: string,
  payload: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000),
): { signature: string; timestamp: number } {
  const signedPayload = buildWebhookSignedPayload(timestampSeconds, payload);
  const hash = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return {
    signature: `sha256=${hash}`,
    timestamp: timestampSeconds,
  };
}

export function verifyWebhookSignature(input: {
  secret: string;
  payload: string;
  signature: string;
  timestamp: string | number;
  nowMs?: number;
  maxSkewMs?: number;
}): WebhookSignatureVerification {
  const timestampSeconds = parseTimestampHeader(input.timestamp);
  if (timestampSeconds === null) {
    return { ok: false, reason: "Invalid webhook timestamp" };
  }

  const nowMs = input.nowMs ?? Date.now();
  const maxSkewMs = input.maxSkewMs ?? WEBHOOK_SIGNATURE_MAX_SKEW_MS;
  const timestampMs = timestampSeconds * 1000;
  if (Math.abs(nowMs - timestampMs) > maxSkewMs) {
    return { ok: false, reason: "Webhook timestamp outside allowed skew window" };
  }

  const expected = parseSignatureHeader(input.signature);
  if (!expected) {
    return { ok: false, reason: "Invalid webhook signature header" };
  }

  const actualHex = signWebhookPayload(input.secret, input.payload, timestampSeconds).signature;
  const actual = parseSignatureHeader(actualHex);
  if (!actual || expected.length !== actual.length) {
    return { ok: false, reason: "Webhook signature mismatch" };
  }

  if (!timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "Webhook signature mismatch" };
  }

  return { ok: true };
}
