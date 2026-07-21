import { NextResponse } from "next/server";
import {
  extractApiKeyFromRequest,
  isApiKeyFormat,
  type ValidatedApiKey,
} from "@/lib/auth/apikey";
import { recordApiUsage, validateStoredApiKey } from "@/lib/auth/api-key-store";
import { apiError } from "@/lib/api/v1/response";
import {
  checkRateLimit,
  rateLimitHeaders,
} from "@/lib/api/v1/rate-limit";

export type EnterpriseApiContext = {
  apiKey: ValidatedApiKey;
};

export type EnterpriseRouteContext<
  TParams extends Record<string, string> = Record<string, never>,
> = {
  params: Promise<TParams>;
};

type EnterpriseRouteHandler<
  TParams extends Record<string, string> = Record<string, never>,
> = (
  request: Request,
  context: EnterpriseApiContext & EnterpriseRouteContext<TParams>,
) => Promise<NextResponse> | NextResponse;

export function withEnterpriseApi<
  TParams extends Record<string, string> = Record<string, never>,
>(
  endpoint: string,
  handler: EnterpriseRouteHandler<TParams>,
) {
  return async (
    request: Request,
    routeContext: EnterpriseRouteContext<TParams>,
  ): Promise<NextResponse> => {
    const startedAt = Date.now();
    const plaintext = extractApiKeyFromRequest(request);

    if (!plaintext) {
      return apiError(401, "Missing API key. Provide x-api-key or Authorization: Bearer.", {
        docs: "https://refwatch.ca/methodology",
      });
    }

    if (!isApiKeyFormat(plaintext)) {
      return apiError(401, "Invalid API key format.");
    }

    const apiKey = await validateStoredApiKey(plaintext);
    if (!apiKey) {
      return apiError(401, "Invalid or inactive API key.");
    }

    const rateLimit = checkRateLimit(apiKey.id, apiKey.tier);
    if (!rateLimit.allowed) {
      return apiError(429, "Rate limit exceeded for this API key tier.", {
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        ),
      }, {
        headers: {
          ...rateLimitHeaders(rateLimit),
          "Retry-After": String(
            Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          ),
        },
      });
    }

    let response: NextResponse;
    try {
      response = await handler(request, { apiKey, ...routeContext });
    } catch (error) {
      response = apiError(
        500,
        error instanceof Error ? error.message : "Internal server error.",
      );
    }

    const latencyMs = Date.now() - startedAt;
    await recordApiUsage({
      apiKeyId: apiKey.id,
      clientId: apiKey.clientId,
      endpoint,
      method: request.method,
      latencyMs,
      statusCode: response.status,
    });

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(rateLimitHeaders(rateLimit))) {
      headers.set(key, value);
    }
    headers.set("X-RefWatch-Client-Id", apiKey.clientId);
    headers.set("X-RefWatch-Api-Version", "v1");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
