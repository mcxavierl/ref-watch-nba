export const SUBSCRIPTION_TIERS = ["FREE", "DEVELOPER", "ENTERPRISE"] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export type SubscriptionStatus = "active" | "suspended" | "revoked";

export type ApiSubscription = {
  id: string;
  tier: SubscriptionTier;
  email: string | null;
  status: SubscriptionStatus;
};

export type ValidateApiKeyResult =
  | { ok: true; subscription: ApiSubscription }
  | { ok: false; reason: "missing" | "invalid" | "suspended" };

export type RateLimitResult =
  | { allowed: true; limit: number | null; remaining: number | null; reset: number | null }
  | {
      allowed: false;
      limit: number;
      remaining: number;
      reset: number;
    };

export type ApiV1Context = {
  subscription: ApiSubscription;
  request: Request;
};
