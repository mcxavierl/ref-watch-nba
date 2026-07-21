import { NextResponse } from "next/server";
import { runSlatePoll } from "@/lib/cron/slatePoller";
import { revalidateSlatePaths, slateApiCacheKeys } from "@/lib/cron/revalidate-slate-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runSlatePoll({
      force,
      rebuildOverview: true,
      runIntegrity: url.searchParams.get("integrity") === "1",
      writeAlerts: url.searchParams.get("alerts") === "1",
    });

    const revalidatedPaths =
      result.status === "success" || result.status === "partial"
        ? revalidateSlatePaths()
        : [];

    return NextResponse.json({
      ok: true,
      result,
      revalidatedPaths,
      flushedApiCacheKeys: slateApiCacheKeys(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Slate poll failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
