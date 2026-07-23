import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildCrewDnaSynthesis,
  buildMatchupCrewRoster,
  buildMatchupDriverLines,
  buildMatchupMatrixRows,
  buildMatchupTerminalMetrics,
  buildMatchupTrustSignalBar,
  buildMatchupVerdictHeadline,
  buildOfficiatingFingerprintTechnicalLines,
} from "@/lib/matchup-preview-terminal";

function previewFixture(
  overrides: Partial<GameSlatePreviewPayload> = {},
): GameSlatePreviewPayload {
  return {
    gameId: "game-1",
    leagueId: "wnba",
    leagueLabel: "WNBA",
    sport: "wnba",
    basePath: "/wnba",
    matchup: "PHO @ LAS",
    awayTeam: "Phoenix Mercury",
    homeTeam: "Las Vegas Aces",
    awayAbbr: "PHO",
    homeAbbr: "LAS",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 528,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 165,
    totalPointsDelta: 2.1,
    overRate: 0.54,
    avgFouls: 34.9,
    foulsDelta: 0.9,
    crew: [
      { name: "Roy Gulbeyan", number: 12, slug: "roy-gulbeyan-12" },
      { name: "Marcy Williams", number: 13, slug: "marcy-williams-13" },
      { name: "Blanca Burns", number: 14, slug: "blanca-burns-14" },
    ],
    refTeamRows: [
      {
        refSlug: "roy-gulbeyan-12",
        refName: "Roy Gulbeyan",
        refNumber: 12,
        teamAbbr: "PHO",
        teamLabel: "Phoenix Mercury",
        games: 8,
        record: "3-5",
        winRate: 0.4,
        avgTotal: 164,
        overRate: 0.5,
        foulsDelta: 0.9,
        isOutlier: true,
      },
      {
        refSlug: "roy-gulbeyan-12",
        refName: "Roy Gulbeyan",
        refNumber: 12,
        teamAbbr: "LAS",
        teamLabel: "Las Vegas Aces",
        games: 10,
        record: "6-4",
        winRate: 0.538,
        avgTotal: 166,
        overRate: 0.52,
        foulsDelta: -3.2,
        isOutlier: true,
      },
      {
        refSlug: "marcy-williams-13",
        refName: "Marcy Williams",
        refNumber: 13,
        teamAbbr: "PHO",
        teamLabel: "Phoenix Mercury",
        games: 6,
        record: "4-2",
        winRate: 0.75,
        avgTotal: 165,
        overRate: 0.5,
        foulsDelta: 0,
        isOutlier: false,
      },
      {
        refSlug: "marcy-williams-13",
        refName: "Marcy Williams",
        refNumber: 13,
        teamAbbr: "LAS",
        teamLabel: "Las Vegas Aces",
        games: 7,
        record: "3-4",
        winRate: 0.4,
        avgTotal: 164,
        overRate: 0.48,
        foulsDelta: -1.2,
        isOutlier: false,
      },
    ],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("matchup preview terminal", () => {
  it("builds verdict headline from whistle delta personality", () => {
    assert.equal(buildMatchupVerdictHeadline(previewFixture()).label, "Baseline whistle profile");
    assert.equal(
      buildMatchupVerdictHeadline(previewFixture({ foulsDelta: 2.0 })).personality,
      "high",
    );
  });

  it("builds hero metrics from projection evidence", () => {
    const preview = previewFixture();
    const evidence = buildProjectionEvidence(preview);
    const metrics = buildMatchupTerminalMetrics(preview, evidence);
    assert.equal(metrics.length, 3);
    assert.match(metrics[0]!.value, /\d+\.\d/);
    assert.match(metrics[1]!.value, /%$/);
    assert.match(metrics[2]!.value, /\/ 10$/);
  });

  it("formats trust signal bar with sample and crew counts", () => {
    const bar = buildMatchupTrustSignalBar(previewFixture());
    assert.match(bar, /528 historical games/);
    assert.match(bar, /3 crews/);
    assert.doesNotMatch(bar, /✓/);
  });

  it("builds crew DNA synthesis and impact directives", () => {
    const synthesis = buildCrewDnaSynthesis(previewFixture({ foulsDelta: 2.8 }));
    assert.match(synthesis.synthesisLine, /^RefWatch Synthesis:/);
    assert.equal(synthesis.directives.length, 3);
    assert.equal(synthesis.directives[0]?.id, "free_throw_volume");
    assert.match(synthesis.directives[0]?.value ?? "", /expected FTs/);
  });

  it("builds technical fingerprint lines for pro accordion", () => {
    const lines = buildOfficiatingFingerprintTechnicalLines(previewFixture());
    assert.equal(lines.length, 0);
  });

  it("builds compact driver lines capped at three per direction", () => {
    const evidence = buildProjectionEvidence(
      previewFixture({ foulsDelta: 3.8, totalPointsDelta: 4.5 }),
    );
    const drivers = buildMatchupDriverLines(evidence);
    assert.ok(drivers.positive.length <= 3);
    assert.ok(drivers.negative.length <= 3);
    if (drivers.positive[0]) {
      assert.equal(drivers.positive[0].direction, "increase");
    }
  });

  it("builds crew roster and team matrix rows", () => {
    const preview = previewFixture();
    const roster = buildMatchupCrewRoster(preview);
    assert.equal(roster.length, 3);
    assert.equal(roster[0]?.name, "Roy Gulbeyan");

    const matrix = buildMatchupMatrixRows(preview);
    assert.equal(matrix.awayAbbr, "PHO");
    assert.equal(matrix.homeAbbr, "LAS");
    assert.equal(matrix.rows[0]?.away.foulsDeltaLabel, "+0.9");
    assert.equal(matrix.rows[0]?.home.foulsDeltaLabel, "-3.2");
  });
});
