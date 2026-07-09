import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preloadLeagueDataForPath } from "@/lib/edge-preload";
import { shouldRedirectHiddenLeague } from "@/lib/header-leagues";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldRedirectHiddenLeague(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  await preloadLeagueDataForPath(request.nextUrl.origin, pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|icon|data/|cdn-cgi/).*)",
  ],
};
