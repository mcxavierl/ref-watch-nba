import { hashApiKey } from "@/lib/api/hash-api-key";
import type {
  ApiSubscription,
  SubscriptionStatus,
  SubscriptionTier,
  ValidateApiKeyResult,
} from "@/lib/api/types";
import { SUBSCRIPTION_TIERS } from "@/lib/api/types";

type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
    };
  };
};

type SubscriptionRow = {
  id: string;
  tier: string;
  email: string | null;
  status: string;
};

function parseTier(value: string): SubscriptionTier | null {
  return SUBSCRIPTION_TIERS.includes(value as SubscriptionTier)
    ? (value as SubscriptionTier)
    : null;
}

function parseStatus(value: string): SubscriptionStatus | null {
  if (value === "active" || value === "suspended" || value === "revoked") {
    return value;
  }
  return null;
}

function rowToSubscription(row: SubscriptionRow): ApiSubscription | null {
  const tier = parseTier(row.tier);
  const status = parseStatus(row.status);
  if (!tier || !status) return null;
  return {
    id: row.id,
    tier,
    email: row.email,
    status,
  };
}

async function getD1Database(): Promise<D1DatabaseLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as { DB?: D1DatabaseLike }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}

async function lookupSubscriptionByHash(
  apiKeyHash: string,
): Promise<ApiSubscription | null> {
  const db = await getD1Database();
  if (!db) return null;

  const row = await db
    .prepare(
      `SELECT id, tier, email, status
       FROM subscriptions
       WHERE api_key_hash = ?
       LIMIT 1`,
    )
    .bind(apiKeyHash)
    .first<SubscriptionRow>();

  return row ? rowToSubscription(row) : null;
}

type DevSubscriptionSeed = {
  key: string;
  tier: SubscriptionTier;
  id?: string;
  email?: string;
  status?: SubscriptionStatus;
};

function readDevSubscriptionSeeds(): DevSubscriptionSeed[] {
  const raw = process.env.API_V1_SUBSCRIPTIONS_JSON;
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as DevSubscriptionSeed[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("[api-v1] Invalid API_V1_SUBSCRIPTIONS_JSON");
    return [];
  }
}

function lookupDevSubscription(apiKey: string): ApiSubscription | null {
  const match = readDevSubscriptionSeeds().find((entry) => entry.key === apiKey);
  if (!match) return null;
  return {
    id: match.id ?? `dev-${match.tier.toLowerCase()}`,
    tier: match.tier,
    email: match.email ?? null,
    status: match.status ?? "active",
  };
}

/**
 * Validates an API key against the `subscriptions` table (Cloudflare D1).
 * In non-production, falls back to `API_V1_SUBSCRIPTIONS_JSON` for local onboarding.
 */
export async function validateApiKey(key: string): Promise<ValidateApiKeyResult> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { ok: false, reason: "missing" };
  }

  const apiKeyHash = await hashApiKey(trimmed);
  const fromDb = await lookupSubscriptionByHash(apiKeyHash);
  if (fromDb) {
    if (fromDb.status !== "active") {
      return { ok: false, reason: "suspended" };
    }
    return { ok: true, subscription: fromDb };
  }

  if (process.env.NODE_ENV !== "production") {
    const dev = lookupDevSubscription(trimmed);
    if (dev) {
      if (dev.status !== "active") {
        return { ok: false, reason: "suspended" };
      }
      return { ok: true, subscription: dev };
    }
  }

  return { ok: false, reason: "invalid" };
}
