import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preloadLeagueDataForPath } from "@/lib/edge-preload";

export async function middleware(request: NextRequest) {
  await preloadLeagueDataForPath(request.nextUrl.origin, request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|icon|data/|cdn-cgi/).*)",
  ],
};
