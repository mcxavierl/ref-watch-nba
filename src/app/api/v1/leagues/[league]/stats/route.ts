import { withApiV1Gateway } from "@/lib/api/gateway";
import {
  buildLeagueStatsApiPayload,
  isPublicApiLeagueId,
} from "@/lib/api/internal-data";
import { jsonError, jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ league: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return withApiV1Gateway(request, async () => {
    const { league } = await context.params;
    const leagueId = league.toLowerCase();

    if (!isPublicApiLeagueId(leagueId)) {
      return jsonError(404, "league_not_found", `Unknown league: ${league}`);
    }

    return jsonOk({
      data: buildLeagueStatsApiPayload(leagueId),
    });
  });
}
