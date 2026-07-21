import { withEnterpriseApi } from "@/lib/auth/enterprise-api-middleware";
import { apiError, apiSuccess } from "@/lib/api/v1/response";
import { loadUpcomingGames, parseLeagueId } from "@/lib/api/v1/upcoming-games";

export const dynamic = "force-dynamic";

export const GET = withEnterpriseApi("/api/v1/games/upcoming", async (request, { apiKey }) => {
  const { searchParams } = new URL(request.url);
  const leagueId = parseLeagueId(searchParams.get("league"));
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? limitParam : 20;

  const payload = loadUpcomingGames({
    leagueId: leagueId ?? undefined,
    limit,
  });

  if (payload.games.length === 0) {
    return apiError(404, "No upcoming games found for the requested scope.", {
      league: leagueId,
    });
  }

  return apiSuccess(payload.games, {
    count: payload.games.length,
    league: leagueId,
    lastUpdated: payload.lastUpdated,
    clientId: apiKey.clientId,
  });
});
