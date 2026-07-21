import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const SEALED_PREFIX = "sealed:v1:";
const DEV_MASTER_FALLBACK = "refwatch-dev-webhook-master";

function deriveMasterKey(): Buffer {
  const raw = process.env.REFWATCH_WEBHOOK_MASTER_KEY?.trim();
  const material = raw && raw.length > 0 ? raw : DEV_MASTER_FALLBACK;
  return scryptSync(material, "refwatch-webhook-v1", 32);
}

export function isWebhookSecretSealed(value: string): boolean {
  return value.startsWith(SEALED_PREFIX);
}

export function sealWebhookSecret(plaintext: string): string {
  if (isWebhookSecretSealed(plaintext)) {
    return plaintext;
  }

  const key = deriveMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SEALED_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function openWebhookSecret(stored: string): string {
  if (!isWebhookSecretSealed(stored)) {
    return stored;
  }

  const payload = stored.slice(SEALED_PREFIX.length);
  const [ivHex, tagHex, ciphertextHex] = payload.split(":");
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error("Malformed sealed webhook secret");
  }

  const key = deriveMasterKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function normalizeWebhookSecretForStorage(secret: string): string {
  return sealWebhookSecret(secret);
}
