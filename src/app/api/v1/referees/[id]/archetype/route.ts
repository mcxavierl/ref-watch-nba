import { withEnterpriseApi } from "@/lib/auth/enterprise-api-middleware";
import { buildRefereeArchetypePayload } from "@/lib/api/v1/ref-archetype";
import { parseLeagueId } from "@/lib/api/v1/upcoming-games";
import { apiError, apiSuccess } from "@/lib/api/v1/response";

export const dynamic = "force-dynamic";

export const GET = withEnterpriseApi<{ params: Promise<{ id: string }> }>(
  "/api/v1/referees/:id/archetype",
  async (request, { apiKey, params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const leagueId = parseLeagueId(searchParams.get("league"));

    if (!leagueId) {
      return apiError(400, "Missing or invalid league query parameter.", {
        example: "/api/v1/referees/scott-foster-48/archetype?league=nba",
      });
    }

    const payload = buildRefereeArchetypePayload(id, leagueId);
    if (!payload) {
      return apiError(404, `Official not found: ${id}`, { leagueId });
    }

    return apiSuccess(payload, {
      officialId: id,
      leagueId,
      clientId: apiKey.clientId,
    });
  },
);
