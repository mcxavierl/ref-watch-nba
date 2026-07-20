import { enforceRateLimit, rateLimitHeaders } from "@/lib/api/rate-limit";
import { jsonError } from "@/lib/api/responses";
import { validateApiKey } from "@/lib/api/subscriptions";
import type { ApiV1Context } from "@/lib/api/types";

const API_KEY_HEADER = "x-api-key";

export function extractApiKey(request: Request): string | null {
  const header = request.headers.get(API_KEY_HEADER);
  if (header?.trim()) return header.trim();

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
}

/**
 * Authenticates and rate-limits external `/api/v1/*` requests.
 * SSR and RSC continue to call `@/lib/api/internal-data` directly.
 */
export async function withApiV1Gateway(
  request: Request,
  handler: (ctx: ApiV1Context) => Promise<Response>,
): Promise<Response> {
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return jsonError(
      401,
      "missing_api_key",
      "Provide a valid API key in the x-api-key header.",
    );
  }

  const auth = await validateApiKey(apiKey);
  if (!auth.ok) {
    if (auth.reason === "suspended") {
      return jsonError(403, "subscription_inactive", "This API key is suspended or revoked.");
    }
    return jsonError(401, "invalid_api_key", "The API key is invalid or expired.");
  }

  const rate = await enforceRateLimit(auth.subscription.id, auth.subscription.tier);
  if (!rate.allowed) {
    return jsonError(
      429,
      "rate_limit_exceeded",
      "Rate limit exceeded for your subscription tier.",
      rateLimitHeaders(rate),
    );
  }

  const response = await handler({
    subscription: auth.subscription,
    request,
  });

  for (const [key, value] of Object.entries(rateLimitHeaders(rate))) {
    response.headers.set(key, value);
  }
  response.headers.set("X-RefWatch-Tier", auth.subscription.tier);
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}
