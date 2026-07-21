import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";

function previewFixture(
  overrides: Partial<GameSlatePreviewPayload> = {},
): GameSlatePreviewPayload {
  return {
    gameId: "game-1",
    leagueId: "nba",
    leagueLabel: "NBA",
    sport: "nba",
    basePath: "/nba",
    matchup: "LAL @ BOS",
    awayTeam: "Los Angeles Lakers",
    homeTeam: "Boston Celtics",
    awayAbbr: "LAL",
    homeAbbr: "BOS",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 220,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 228,
    totalPointsDelta: 4.2,
    overRate: 0.56,
    avgFouls: 43.4,
    foulsDelta: 3.8,
    crew: [{ name: "Scott Foster", number: 48, slug: "scott-foster-48" }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("evidence card integration", () => {
  it("builds teaser-ready evidence from slate preview payloads", () => {
    const evidence = buildProjectionEvidence(previewFixture());
    assert.ok(evidence.evidenceStrength >= 0 && evidence.evidenceStrength <= 10);
    assert.ok(evidence.confidencePct >= 0 && evidence.confidencePct <= 100);
    assert.ok(evidence.modelContribution.length > 0);
    assert.equal(
      evidence.modelContribution.reduce((sum, row) => sum + row.percentage, 0),
      100,
    );
  });
});
