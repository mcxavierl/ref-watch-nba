import { NextResponse } from "next/server";
import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";
import {
  generateScoutingReport,
  type GameScoutingMetadata,
} from "@/lib/analytics/generate-scouting-report";
import { resolveOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import { LEAGUE_IDS, type LeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

function parseLeagueId(value: string | null): LeagueId | null {
  if (!value) return null;
  return LEAGUE_IDS.includes(value as LeagueId) ? (value as LeagueId) : null;
}

function parseBooleanFlag(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ officialId: string }> },
) {
  const { officialId } = await context.params;
  const { searchParams } = new URL(request.url);

  const leagueId = parseLeagueId(searchParams.get("league"));
  if (!leagueId) {
    return NextResponse.json(
      {
        error: "Missing or invalid league query parameter.",
        example: "/api/v1/refs/adrian-hill-29/scouting-report?league=nfl",
      },
      { status: 400 },
    );
  }

  const resolved = resolveOfficialProfile(officialId, leagueId);
  if (!resolved) {
    return NextResponse.json(
      { error: `Official not found: ${officialId}` },
      { status: 404 },
    );
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
    return NextResponse.json(
      {
        error: "Insufficient game history to generate scouting report.",
        officialId,
        leagueId,
        minimumGames: SAMPLE_SIZE_THRESHOLD,
      },
      { status: 422 },
    );
  }

  const elite = {
    archetype: report.archetype,
    consistencyScore: report.consistencyScore,
    leverageSensitivityIndex: report.leverageSensitivityIndex,
    pressureIndex: report.pressureIndex,
    pressureTendencyLabel: report.pressureTendencyLabel,
    pressureTendencyDisplay: report.pressureTendencyDisplay,
    edge_note: report.edgeNote,
  };

  return NextResponse.json({
    data: report,
    ...elite,
    meta: {
      version: "v1",
      officialId,
      leagueId,
      generatedAt: report.generatedAt,
      ...elite,
    },
  });
}
