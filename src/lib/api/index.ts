/**
 * Ref Watch API v1 — external programmatic access only.
 *
 * Website SSR/RSC must import `@/lib/load-league-stats` (or `@/lib/api/internal-data`)
 * directly. Do not route internal pages through `/api/v1`.
 */
export { withApiV1Gateway, extractApiKey } from "@/lib/api/gateway";
export { validateApiKey } from "@/lib/api/subscriptions";
export { enforceRateLimit } from "@/lib/api/rate-limit";
export type {
  ApiSubscription,
  SubscriptionTier,
  ValidateApiKeyResult,
} from "@/lib/api/types";
