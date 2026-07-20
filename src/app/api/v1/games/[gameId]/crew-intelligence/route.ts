import { NextResponse } from "next/server";
import { buildCrewIntelligenceReport } from "@/lib/analytics/build-crew-intelligence-report";
import { LEAGUE_IDS, type LeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

function parseLeagueId(value: string | null): LeagueId | null {
  if (!value) return null;
  return LEAGUE_IDS.includes(value as LeagueId) ? (value as LeagueId) : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await context.params;
  const { searchParams } = new URL(request.url);
  const leagueId = parseLeagueId(searchParams.get("league"));

  if (!leagueId) {
    return NextResponse.json(
      {
        error: "Missing or invalid league query parameter.",
        example: "/api/v1/games/401772971/crew-intelligence?league=nfl",
      },
      { status: 400 },
    );
  }

  const report = buildCrewIntelligenceReport(gameId, leagueId);
  if (!report) {
    return NextResponse.json(
      {
        error: "Game not found or crew intelligence unavailable.",
        gameId,
        leagueId,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: report,
    crew_archetype_profile: report.crew_archetype_profile,
    archetype_variance: report.archetype_variance,
    edge_note: report.edge_note,
    meta: {
      version: "v1",
      gameId,
      leagueId,
      generatedAt: new Date().toISOString(),
    },
  });
}
