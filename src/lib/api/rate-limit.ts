import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitResult, SubscriptionTier } from "@/lib/api/types";

const TIER_LIMITS: Record<
  Exclude<SubscriptionTier, "ENTERPRISE">,
  { limit: number; window: "1 d" | "30 d" }
> = {
  FREE: { limit: 50, window: "1 d" },
  DEVELOPER: { limit: 10_000, window: "30 d" },
};

type TierLimiter = Ratelimit;

const limiterCache = new Map<SubscriptionTier, TierLimiter | null>();

function isRateLimitDisabled(): boolean {
  return process.env.API_V1_RATE_LIMIT_DISABLED === "1";
}

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getTierLimiter(tier: Exclude<SubscriptionTier, "ENTERPRISE">): TierLimiter | null {
  const cached = limiterCache.get(tier);
  if (cached !== undefined) return cached;

  const redis = createRedisClient();
  if (!redis) {
    limiterCache.set(tier, null);
    return null;
  }

  const config = TIER_LIMITS[tier];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(config.limit, config.window),
    prefix: `refwatch:api-v1:${tier.toLowerCase()}`,
    analytics: true,
  });
  limiterCache.set(tier, limiter);
  return limiter;
}

/** Enforces tier quotas. ENTERPRISE is unlimited. */
export async function enforceRateLimit(
  subscriptionId: string,
  tier: SubscriptionTier,
): Promise<RateLimitResult> {
  if (tier === "ENTERPRISE") {
    return { allowed: true, limit: null, remaining: null, reset: null };
  }

  if (isRateLimitDisabled()) {
    const config = TIER_LIMITS[tier];
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      reset: null,
    };
  }

  const limiter = getTierLimiter(tier);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error("[api-v1] Upstash not configured; denying request in production");
      return {
        allowed: false,
        limit: TIER_LIMITS[tier].limit,
        remaining: 0,
        reset: Date.now() + 60_000,
      };
    }
    const config = TIER_LIMITS[tier];
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      reset: null,
    };
  }

  const result = await limiter.limit(subscriptionId);
  if (result.success) {
    return {
      allowed: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  return {
    allowed: false,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  if (result.limit === null) {
    return {
      "X-RateLimit-Limit": "unlimited",
    };
  }
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining ?? 0)),
    "X-RateLimit-Reset": String(result.reset ?? 0),
  };
}
