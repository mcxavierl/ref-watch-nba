import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldRedirectHiddenLeague } from "@/lib/header-leagues";
import { shouldRedirectLocalOnlyLeague } from "@/lib/local-only-leagues";
import { LEAGUES, SITE_HOME_PATH } from "@/lib/leagues";
import { isVerifiedLiveLeague } from "@/lib/league-verification";
import { COMING_SOON_LEAGUE_IDS, GATED_COLLEGE_LEAGUE_IDS } from "@/lib/site-route-config";

function isComingSoonLeaguePath(pathname: string): boolean {
  for (const leagueId of COMING_SOON_LEAGUE_IDS) {
    const prefix = LEAGUES[leagueId].pathPrefix;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

function isNcaaIntegrityAuditPath(pathname: string): boolean {
  return (
    pathname === "/ncaa/integrity-audit" ||
    pathname.startsWith("/ncaa/integrity-audit/")
  );
}

function isGatedCollegePath(pathname: string): boolean {
  if (isNcaaIntegrityAuditPath(pathname)) {
    return false;
  }
  if (pathname === "/ncaa" || pathname.startsWith("/ncaa/")) {
    return true;
  }
  for (const leagueId of GATED_COLLEGE_LEAGUE_IDS) {
    if (isVerifiedLiveLeague(leagueId)) continue;
    const prefix = LEAGUES[leagueId].pathPrefix;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/overview" || pathname === "/overview/") {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url, 308);
  }

  if (isComingSoonLeaguePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url);
  }

  if (pathname === "/ncaa" || pathname === "/ncaa/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ncaa/integrity-audit";
    return NextResponse.redirect(url, 308);
  }

  if (isGatedCollegePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url);
  }

  if (shouldRedirectLocalOnlyLeague(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SITE_HOME_PATH;
    return NextResponse.redirect(url);
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
