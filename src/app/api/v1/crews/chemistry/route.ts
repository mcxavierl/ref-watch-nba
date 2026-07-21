import { withEnterpriseApi } from "@/lib/auth/enterprise-api-middleware";
import {
  buildCrewChemistryPayload,
  parseCrewChemistryLeague,
  parseCrewSlugsParam,
} from "@/lib/api/v1/crew-chemistry";
import { apiError, apiSuccess } from "@/lib/api/v1/response";

export const dynamic = "force-dynamic";

export const GET = withEnterpriseApi("/api/v1/crews/chemistry", async (request, { apiKey }) => {
  const { searchParams } = new URL(request.url);
  const leagueId = parseCrewChemistryLeague(searchParams.get("league"));
  const crewSlugs = parseCrewSlugsParam(searchParams.get("crew"));
  const gameId = searchParams.get("gameId")?.trim() || undefined;

  if (!leagueId) {
    return apiError(400, "Missing or invalid league query parameter.", {
      example: "/api/v1/crews/chemistry?league=nba&crew=scott-foster-48|tony-brothers-25|ed-malloy-14",
    });
  }

  if (!gameId && crewSlugs.length === 0) {
    return apiError(400, "Provide crew (pipe-separated slugs) or gameId.", {
      example: "/api/v1/crews/chemistry?league=nba&gameId=0022500001",
    });
  }

  const payload = buildCrewChemistryPayload({
    leagueId,
    crewSlugs: crewSlugs.length > 0 ? crewSlugs : undefined,
    gameId,
  });

  if (!payload) {
    return apiError(404, "Crew chemistry could not be resolved for the request.", {
      leagueId,
      gameId,
      crew: crewSlugs,
    });
  }

  return apiSuccess(payload, {
    leagueId,
    clientId: apiKey.clientId,
  });
});
