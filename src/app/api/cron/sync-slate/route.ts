import { runSyncSlatePipeline } from "@/lib/cron/sync-slate-pipeline";
import {
  unauthorizedCronResponse,
  verifyCronSecret,
} from "@/lib/cron/verify-cron-secret";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorizedCronResponse();
  }

  const result = await runSyncSlatePipeline();

  return Response.json(result, {
    status: result.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
