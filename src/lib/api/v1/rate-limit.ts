import type { ApiKeyTier } from "@/lib/auth/apikey";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 60_000;
const STANDARD_LIMIT = 100;
const ENTERPRISE_LIMIT = Number.MAX_SAFE_INTEGER;

const buckets = new Map<string, Bucket>();

function tierLimit(tier: ApiKeyTier): number {
  return tier === "enterprise" ? ENTERPRISE_LIMIT : STANDARD_LIMIT;
}

export function checkRateLimit(apiKeyId: string, tier: ApiKeyTier): RateLimitResult {
  const limit = tierLimit(tier);
  const now = Date.now();
  const bucket = buckets.get(apiKeyId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(apiKeyId, { count: 1, windowStart: now });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt: now + WINDOW_MS,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: bucket.windowStart + WINDOW_MS,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.windowStart + WINDOW_MS,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}

const UNAUTHENTICATED_BUCKET_PREFIX = "unauthenticated:";

export function resolveUnauthenticatedRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const clientIp = forwarded || realIp || "unknown";
  return `${UNAUTHENTICATED_BUCKET_PREFIX}${clientIp}`;
}

export function checkUnauthenticatedRateLimit(request: Request): RateLimitResult {
  return checkRateLimit(resolveUnauthenticatedRateLimitKey(request), "standard");
}

export function unauthenticatedRateLimitHeaders(request: Request): Record<string, string> {
  return rateLimitHeaders(checkUnauthenticatedRateLimit(request));
}
