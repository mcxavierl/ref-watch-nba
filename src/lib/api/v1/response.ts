import { NextResponse } from "next/server";

export function apiError(
  status: number,
  message: string,
  details?: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...details,
    },
    { status, ...init },
  );
}

export function apiSuccess<T>(
  data: T,
  meta: Record<string, unknown> = {},
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: {
        version: "v1",
        generatedAt: new Date().toISOString(),
        ...meta,
      },
    },
    init,
  );
}
