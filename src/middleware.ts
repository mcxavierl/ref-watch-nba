import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { RefStatsFile } from "@/lib/types";
import "@/lib/global-stats";

async function preloadRefStats(
  origin: string,
  cacheKey: "__REFWATCH_NBA_REF_STATS__" | "__REFWATCH_NHL_REF_STATS__",
  basePath: string,
): Promise<void> {
  if (globalThis[cacheKey]) return;

  for (const file of ["ref-stats.json", "ref-stats.seed.json"]) {
    const res = await fetch(`${origin}${basePath}/${file}`);
    if (!res.ok) continue;
    const data = (await res.json()) as RefStatsFile;
    if (data.refs?.length) {
      globalThis[cacheKey] = data;
      return;
    }
  }
}

export async function middleware(request: NextRequest) {
  const origin = request.nextUrl.origin;
  await Promise.all([
    preloadRefStats(origin, "__REFWATCH_NBA_REF_STATS__", "/data/nba"),
    preloadRefStats(origin, "__REFWATCH_NHL_REF_STATS__", "/data/nhl"),
  ]);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
