import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  leaguesForPath,
  preloadRefStatsFromAssets,
} from "@/lib/ref-stats-preload";

export async function middleware(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const leagues = leaguesForPath(request.nextUrl.pathname);

  await Promise.all(
    leagues.map((league) => preloadRefStatsFromAssets(origin, league)),
  );

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
