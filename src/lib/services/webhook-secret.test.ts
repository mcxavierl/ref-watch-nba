import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWebhookSecretSealed,
  openWebhookSecret,
  sealWebhookSecret,
} from "@/lib/services/webhookSecret";

describe("webhook secret storage", () => {
  it("seals and opens webhook secrets without storing plaintext", () => {
    const plaintext = "rw_webhook_secret_abcdef123456";
    const sealed = sealWebhookSecret(plaintext);
    assert.equal(isWebhookSecretSealed(sealed), true);
    assert.notEqual(sealed, plaintext);
    assert.equal(openWebhookSecret(sealed), plaintext);
  });

  it("passes through legacy plaintext secrets for migration", () => {
    const legacy = "legacy-plaintext-secret";
    assert.equal(isWebhookSecretSealed(legacy), false);
    assert.equal(openWebhookSecret(legacy), legacy);
  });

  it("does not double-seal already sealed secrets", () => {
    const sealed = sealWebhookSecret("secret-one");
    assert.equal(sealWebhookSecret(sealed), sealed);
  });
});
