import type { RateLimitResult } from "@/lib/api/types";
import { rateLimitHeaders } from "@/lib/api/rate-limit";

export function jsonError(
  status: number,
  code: string,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    },
  );
}

export function jsonOk<T>(
  body: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    rateLimit?: RateLimitResult;
  },
): Response {
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    ...(options?.rateLimit ? rateLimitHeaders(options.rateLimit) : {}),
    ...(options?.headers ?? {}),
  };

  return Response.json(body, {
    status: options?.status ?? 200,
    headers,
  });
}
