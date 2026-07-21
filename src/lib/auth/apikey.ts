import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type ApiKeyTier = "standard" | "enterprise";

export type ApiKeyRecord = {
  id: string;
  clientId: string;
  label: string;
  tier: ApiKeyTier;
  keyHash: string;
  requestCount: number;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ValidatedApiKey = {
  id: string;
  clientId: string;
  label: string;
  tier: ApiKeyTier;
};

const API_KEY_PREFIX = "rw_live_";
const SCRYPT_KEYLEN = 64;

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashApiKey(plaintext: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plaintext, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyApiKey(plaintext: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(plaintext, salt, SCRYPT_KEYLEN);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function extractApiKeyFromRequest(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;

  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function isApiKeyFormat(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length >= API_KEY_PREFIX.length + 16;
}
