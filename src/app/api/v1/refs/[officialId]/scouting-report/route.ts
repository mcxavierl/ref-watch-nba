import { withEnterpriseApi } from "@/lib/auth/enterprise-api-middleware";
import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";
import {
  generateScoutingReport,
  type GameScoutingMetadata,
} from "@/lib/analytics/generate-scouting-report";
import { resolveOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import { parseLeagueId } from "@/lib/api/v1/upcoming-games";
import { apiError, apiSuccess } from "@/lib/api/v1/response";

export const dynamic = "force-dynamic";

function parseBooleanFlag(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

export const GET = withEnterpriseApi<{ officialId: string }>(
  "/api/v1/refs/:officialId/scouting-report",
  async (request, { apiKey, params }) => {
    const { officialId } = await params;
    const { searchParams } = new URL(request.url);

    const leagueId = parseLeagueId(searchParams.get("league"));
    if (!leagueId) {
      return apiError(400, "Missing or invalid league query parameter.", {
        example: "/api/v1/refs/adrian-hill-29/scouting-report?league=nfl",
      });
    }

    const resolved = resolveOfficialProfile(officialId, leagueId);
    if (!resolved) {
      return apiError(404, `Official not found: ${officialId}`, { leagueId });
    }

    const gameMetadata: GameScoutingMetadata = {
      leagueId,
      isPlayoff: parseBooleanFlag(searchParams.get("playoff")),
      isPrimetime: parseBooleanFlag(searchParams.get("primetime")),
      seasonStage:
        (searchParams.get("seasonStage") as GameScoutingMetadata["seasonStage"]) ??
        undefined,
    };

    const report = generateScoutingReport(officialId, gameMetadata, resolved);
    if (!report) {
      return apiError(422, "Insufficient game history to generate scouting report.", {
        officialId,
        leagueId,
        minimumGames: SAMPLE_SIZE_THRESHOLD,
      });
    }

    const elite = {
      archetype: report.archetype,
      consistencyScore: report.consistencyScore,
      leverageSensitivityIndex: report.leverageSensitivityIndex,
      momentumKillerScore: report.momentumKillerScore,
      runStoppageRate: report.runStoppageRate,
      momentumKillerLabel: report.momentumKillerLabel,
      edge_note: report.edgeNote,
    };

    return apiSuccess(report, {
      officialId,
      leagueId,
      clientId: apiKey.clientId,
      generatedAt: report.generatedAt,
      ...elite,
    });
  },
);
