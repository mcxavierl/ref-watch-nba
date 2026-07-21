import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIntelligenceCardContent } from "@/lib/intelligence/build-intelligence-card";
import { formatIntelligenceCitation } from "@/lib/intelligence/format-intelligence-citation";
import {
  isCitationEventAction,
  isIntelligenceMetricType,
} from "@/lib/intelligence/intelligence-card-types";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  isCitationEventPayload,
  persistCitationEvent,
} from "@/lib/services/citation-event-store";

function previewFixture(
  overrides: Partial<GameSlatePreviewPayload> = {},
): GameSlatePreviewPayload {
  return {
    gameId: "0022500001",
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
    sampleGames: 82,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 228,
    totalPointsDelta: 4.2,
    overRate: 0.56,
    avgFouls: 43.4,
    foulsDelta: 2.1,
    crew: [
      { name: "John Smith", number: 48, slug: "john-smith-48", role: "crew_chief" },
      { name: "Mike Johnson", number: 25, slug: "mike-johnson-25", role: "referee" },
      { name: "Alex Davis", number: 14, slug: "alex-davis-14", role: "umpire" },
    ],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("buildIntelligenceCardContent", () => {
  it("builds crew pill and whistle acceleration signal", () => {
    const content = buildIntelligenceCardContent(previewFixture());
    assert.equal(content.crewPill, "Smith / Johnson / Davis");
    assert.equal(content.crewCitation, "Smith/Johnson/Davis");
    assert.match(content.primarySignalLabel, /WHISTLE ENVIRONMENT/);
    assert.match(content.primarySignalBody, /Whistle Acceleration/);
    assert.match(content.sampleFootnote, /82 games/);
    assert.ok(content.proofSubtext.includes("historical games"));
    assert.ok(content.premiumDriverTeaser.length > 0);
  });
});

describe("formatIntelligenceCitation", () => {
  it("formats broadcast-ready citation with link and crew slugs", () => {
    const content = buildIntelligenceCardContent(previewFixture({ foulsDelta: 2.1 }));
    const citation = formatIntelligenceCitation(content);

    assert.match(citation, /According to RefWatch \(https:\/\/refwatch\.ca\)/);
    assert.match(citation, /Smith\/Johnson\/Davis/);
    assert.match(citation, /Whistle Acceleration/);
    assert.match(citation, /82-game sample/);
    assert.doesNotMatch(citation, /<[^>]+>/);
  });
});

describe("citation event store", () => {
  it("validates intelligence metric and action unions", () => {
    assert.equal(isIntelligenceMetricType("Whistle Acceleration"), true);
    assert.equal(isIntelligenceMetricType("Scoring Pace"), true);
    assert.equal(isIntelligenceMetricType("Crew Baseline"), true);
    assert.equal(isIntelligenceMetricType("Unknown Metric"), false);
    assert.equal(isCitationEventAction("COPY_CITATION"), true);
    assert.equal(isCitationEventAction("OTHER"), false);
  });

  it("validates citation payloads", () => {
    assert.equal(
      isCitationEventPayload({
        gameId: "g1",
        refCrew: "Smith/Johnson",
        metricType: "Whistle Acceleration",
        action: "COPY_CITATION",
      }),
      true,
    );
    assert.equal(isCitationEventPayload({ gameId: "g1" }), false);
    assert.equal(
      isCitationEventPayload({
        gameId: "g1",
        refCrew: "Smith/Johnson",
        metricType: "Unknown Metric",
        action: "COPY_CITATION",
      }),
      false,
    );
  });

  it("persists citation events to durable store", async () => {
    const record = await persistCitationEvent({
      gameId: "test-game",
      refCrew: "Smith/Johnson",
      metricType: "Whistle Acceleration",
      action: "COPY_CITATION",
    });
    assert.ok(record.id);
    assert.equal(record.action, "COPY_CITATION");
    assert.equal(record.gameId, "test-game");
  });
});
