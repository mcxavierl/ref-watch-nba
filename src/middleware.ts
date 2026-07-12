import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldRedirectHiddenLeague } from "@/lib/header-leagues";
import { SITE_HOME_PATH } from "@/lib/leagues";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/overview" || pathname === "/overview/") {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url, 308);
  }

  if (shouldRedirectHiddenLeague(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url);
  }

  // League JSON is hydrated in root layout (SSR). Preloading multi-MB assets here
  // exceeded Worker memory/CPU and surfaced Cloudflare errors 1100/1102.
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
