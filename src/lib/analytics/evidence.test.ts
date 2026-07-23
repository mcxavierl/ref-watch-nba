import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCrewBaselineHeadline,
  calculateConfidencePct,
  calculateEvidenceStrength,
  containsSubjectiveLanguage,
  createEvidenceDriver,
  sanitizeObservationalCopy,
} from "@/lib/analytics/evidence";
import { buildProjectionEvidence, deriveMatchupConfidenceInputs } from "@/lib/analytics/build-projection-evidence";
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
    refTeamRows: [
      {
        refSlug: "scott-foster-48",
        refName: "Scott Foster",
        refNumber: 48,
        teamAbbr: "LAL",
        teamLabel: "Los Angeles Lakers",
        games: 18,
        record: "10-8",
        winRate: 0.56,
        avgTotal: 226,
        overRate: 0.58,
        foulsDelta: 2.4,
        isOutlier: true,
        outlierNote: "Above-average foul volume in shared games",
      },
    ],
    teamImpacts: [
      {
        teamAbbr: "LAL",
        teamLabel: "Los Angeles Lakers",
        insights: [
          {
            refSlug: "scott-foster-48",
            refName: "Scott Foster",
            winRate: 0.56,
            foulsDelta: 2.4,
            winRateCritical: false,
            foulsDeltaCritical: true,
          },
        ],
      },
    ],
    storylines: [],
    ...overrides,
  };
}

describe("observational renderer", () => {
  it("rejects subjective descriptors", () => {
    assert.equal(containsSubjectiveLanguage("whistle-happy crew"), true);
    assert.equal(containsSubjectiveLanguage("strict ref"), true);
    assert.equal(
      containsSubjectiveLanguage(
        "Crew averaged +3.8 fouls above league baseline over last 220 games",
      ),
      false,
    );
  });

  it("builds crew baseline headlines with measured phrasing", () => {
    const headline = buildCrewBaselineHeadline(3.8, 220, "Fouls", 39.6);
    assert.match(headline, /Crew averaged \+3\.8 fouls vs league baseline \(39\.6\)/);
  });

  it("sanitizes banned terms from copy", () => {
    const sanitized = sanitizeObservationalCopy(
      "Strict crew averaged +2.1 fouls above baseline",
    );
    assert.equal(sanitized.includes("Strict"), false);
  });

  it("throws when subjective language remains in driver headlines", () => {
    assert.throws(() =>
      createEvidenceDriver({
        feature: "bad",
        impact: "HIGH",
        direction: "INCREASE",
        headline: "Ref causes fouls in this matchup",
        detail: "Measured sample.",
        value: 1,
        baseline: 0,
      }),
    );
  });
});

describe("evidence strength and confidence", () => {
  it("boosts strength with sample size and feature agreement", () => {
    const strength = calculateEvidenceStrength({
      sampleGames: 30,
      factorsIncreasing: [
        {
          feature: "a",
          impact: "HIGH",
          direction: "INCREASE",
          headline: "Crew averaged +2.0 fouls above league baseline over last 30 games",
          detail: "detail",
          value: 2,
          baseline: 1,
        },
      ],
      factorsReducing: [],
      projectionDirection: "INCREASE",
      completenessRatio: 0.9,
      valueSigma: 0.7,
    });

    assert.ok(strength >= 7);
  });

  it("calculates confidence from cluster accuracy and strength", () => {
    const confidence = calculateConfidencePct({
      evidenceStrength: 8.5,
      sampleGames: 220,
      clusterAccuracyPct: 61,
      clusterSampleGames: 80,
    });
    assert.equal(confidence, 61);
  });

  it("derives matchup-specific confidence from crew and profile depth", () => {
    const thin = buildProjectionEvidence(
      previewFixture({
        sampleGames: 8,
        foulsDelta: 0.6,
        refTeamRows: [],
        teamImpacts: [],
      }),
    );
    const crewOnly = buildProjectionEvidence(
      previewFixture({
        sampleGames: 46,
        foulsDelta: 1.3,
        refTeamRows: [],
        teamImpacts: [],
      }),
    );
    const rich = buildProjectionEvidence(previewFixture());

    assert.ok(thin.confidencePct >= 35 && thin.confidencePct <= 45);
    assert.ok(crewOnly.confidencePct >= 45 && crewOnly.confidencePct <= 65);
    assert.ok(rich.confidencePct >= 75 && rich.confidencePct <= 92);
    assert.notEqual(thin.confidencePct, rich.confidencePct);
    assert.notEqual(crewOnly.confidencePct, rich.confidencePct);
  });

  it("weights ref-team history and team insights in confidence inputs", () => {
    const sparse = deriveMatchupConfidenceInputs(
      previewFixture({ sampleGames: 46, refTeamRows: [], teamImpacts: [] }),
      7,
    );
    const rich = deriveMatchupConfidenceInputs(previewFixture(), 7.5);
    assert.ok(rich.clusterAccuracyPct > sparse.clusterAccuracyPct);
    assert.ok(rich.clusterSampleGames >= sparse.clusterSampleGames);
  });
});

describe("buildProjectionEvidence", () => {
  it("returns structured payload with increasing and reducing factors", () => {
    const payload = buildProjectionEvidence(previewFixture());
    assert.ok(payload.projection > 0);
    assert.ok(payload.evidenceStrength > 0);
    assert.ok(payload.confidencePct >= 35);
    assert.ok(payload.factorsIncreasing.length >= 1);
    assert.equal(
      payload.modelContribution.reduce((sum, row) => sum + row.percentage, 0),
      100,
    );
  });

  it("uses observational headlines only", () => {
    const payload = buildProjectionEvidence(previewFixture());
    for (const driver of [
      ...payload.factorsIncreasing,
      ...payload.factorsReducing,
    ]) {
      assert.equal(containsSubjectiveLanguage(driver.headline), false);
    }
  });
});
