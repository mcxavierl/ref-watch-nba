import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queryInsights, type InsightsPayload } from "./insights-query";
import { EVERGREEN_TOP_STORIES } from "./evergreen";

const gatedStats = [{ label: "Games", value: "19" }, { label: "Team baseline", value: "48.0%" }];

const mockPayload: InsightsPayload = {
  generatedAt: "2026-07-14T12:00:00.000Z",
  cards: [
    {
      leagueId: "nba",
      label: "NBA",
      shortLabel: "NBA",
      kind: "matrix-edge",
      kicker: "Split",
      headline: "Ref A exceeds SAC baseline",
      story: "Story A",
      heroValue: "+30.0pp",
      heroLabel: "Win rate",
      heroTone: "positive",
      stats: gatedStats,
      links: [{ label: "Matrix", href: "/matrix" }],
      teamAbbr: "SAC",
      refSlug: "ref-a",
    },
    {
      leagueId: "nba",
      label: "NBA",
      shortLabel: "NBA",
      kind: "matrix-edge",
      kicker: "Split",
      headline: "Ref B exceeds LAL baseline",
      story: "Story B",
      heroValue: "+10.0pp",
      heroLabel: "Win rate",
      heroTone: "positive",
      stats: gatedStats,
      links: [{ label: "Matrix", href: "/matrix" }],
      teamAbbr: "LAL",
      refSlug: "ref-b",
    },
  ],
  topStories: [
    {
      leagueId: "nba",
      label: "NBA",
      shortLabel: "NBA",
      kind: "matrix-edge",
      kicker: "Top story",
      headline: "Ref C exceeds SAC baseline",
      story: "Story C",
      heroValue: "+45.0pp",
      heroLabel: "Win rate",
      heroTone: "positive",
      stats: gatedStats,
      links: [{ label: "Matrix", href: "/matrix" }],
      teamAbbr: "SAC",
      refSlug: "ref-c",
      drilldownId: "nba--ref-c--SAC",
    },
    {
      leagueId: "nhl",
      label: "NHL",
      shortLabel: "NHL",
      kind: "matrix-edge",
      kicker: "Top story",
      headline: "Ref D runs below COL baseline",
      story: "Story D",
      heroValue: "-20.0pp",
      heroLabel: "Win rate",
      heroTone: "negative",
      stats: gatedStats,
      links: [{ label: "Matrix", href: "/nhl/matrix" }],
      teamAbbr: "COL",
      refSlug: "ref-d",
    },
  ],
  topStoriesStatus: "generated",
};

describe("queryInsights", () => {
  it("filters and sorts team insights by heroValue magnitude", () => {
    const result = queryInsights(mockPayload, { teamId: "sac", limit: 5 });
    assert.equal(result.insights.length, 2);
    assert.equal(result.insights[0].refSlug, "ref-c");
    assert.equal(result.insights[1].refSlug, "ref-a");
    assert.ok(result.insights.every((card) => card.teamAbbr === "SAC"));
  });

  it("returns global top stories when no teamId is provided", () => {
    const result = queryInsights(mockPayload, { limit: 2 });
    assert.equal(result.insights.length, 2);
    assert.equal(result.insights[0].refSlug, "ref-c");
    assert.equal(result.status, "generated");
    assert.equal(result.generatedAt, "2026-07-14T12:00:00.000Z");
  });

  it("falls back to cards slice when topStories are empty", () => {
    const payload: InsightsPayload = {
      cards: mockPayload.cards,
      topStories: [],
    };
    const result = queryInsights(payload, { limit: 1 });
    assert.equal(result.insights.length, 1);
    assert.equal(result.insights[0].teamAbbr, "SAC");
  });

  it("returns evergreen fallback when payload has no stories", () => {
    const result = queryInsights({}, { limit: 3 });
    assert.equal(result.status, "fallback");
    assert.deepEqual(result.insights, EVERGREEN_TOP_STORIES.slice(0, 3));
  });

  it("returns empty insights for unknown team", () => {
    const result = queryInsights(mockPayload, { teamId: "BOS" });
    assert.deepEqual(result.insights, []);
  });
});
