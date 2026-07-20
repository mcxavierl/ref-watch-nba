import { withApiV1Gateway } from "@/lib/api/gateway";
import {
  buildLeagueRefsApiPayload,
  isPublicApiLeagueId,
} from "@/lib/api/internal-data";
import { jsonError, jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ league: string }>;
};

function parseLimit(request: Request): number {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return 100;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 100;
  return Math.min(parsed, 500);
}

export async function GET(request: Request, context: RouteContext) {
  return withApiV1Gateway(request, async (ctx) => {
    const { league } = await context.params;
    const leagueId = league.toLowerCase();

    if (!isPublicApiLeagueId(leagueId)) {
      return jsonError(404, "league_not_found", `Unknown league: ${league}`);
    }

    return jsonOk({
      data: buildLeagueRefsApiPayload(leagueId, parseLimit(ctx.request)),
    });
  });
}
