import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectUpcomingCardRefInsights } from "@/lib/upcoming-card-ref-insights";
import { selectUpcomingCardHeroInsight } from "@/lib/upcoming-card-hero-insight";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";

function baseEntry(overrides: Partial<OverviewSlateEntry> = {}): OverviewSlateEntry {
  return {
    leagueId: "nba",
    leagueLabel: "NBA",
    leagueShortLabel: "NBA",
    href: "/nba",
    gameId: "game-1",
    matchup: "TOR @ BOS",
    awayTeam: "TOR",
    homeTeam: "BOS",
    crewCount: 3,
    status: "live",
    headRef: "Scott Foster",
    ...overrides,
  };
}

function preview(overrides: Partial<GameSlatePreviewPayload> = {}): GameSlatePreviewPayload {
  return {
    gameId: "game-1",
    leagueId: "nba",
    leagueLabel: "NBA",
    sport: "nba",
    basePath: "/nba",
    matchup: "TOR @ BOS",
    awayTeam: "TOR",
    homeTeam: "BOS",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 42,
    scoringLabel: "Scoring",
    whistleLabel: "Fouls",
    avgTotalPoints: 220,
    totalPointsDelta: 2,
    overRate: 0.63,
    avgFouls: 42,
    foulsDelta: 0.5,
    crew: [{ name: "Scott Foster", number: 48, slug: "scott-foster" }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("upcoming card hero insight", () => {
  it("prefers a crew over-rate trend when preview data is available", () => {
    const insight = selectUpcomingCardHeroInsight(
      baseEntry({ preview: preview({ overRate: 0.63, ouLean: "over" }) }),
    );
    assert.equal(insight, "Trend: High Over-Rate (63.0%)");
  });

  it("falls back to the strongest preview card insight", () => {
    const insight = selectUpcomingCardHeroInsight(
      baseEntry({
        preview: preview({ overRate: 0.51, ouLean: "neutral", foulsDelta: 0.2 }),
        previewCardInsights: ["Dee Kantor: 72% win rate with LVA"],
      }),
    );
    assert.equal(insight, "Dee Kantor: 72% win rate with LVA");
  });

  it("collects full ref intelligence lines without truncation", () => {
    const longLine =
      "Angelica Suffren · LVA: 63% win rate with LVA · -1.5 fouls on LVA across 18 tracked games";
    const insights = collectUpcomingCardRefInsights(
      baseEntry({
        preview: preview({ overRate: 0.51, ouLean: "neutral", foulsDelta: 0.2 }),
        previewCardInsights: [longLine, "Trend: Low Over-Rate (41.3%)"],
      }),
    );
    assert.ok(insights.includes(longLine));
    assert.ok(insights.includes("Trend: Low Over-Rate (41.3%)"));
    assert.ok(insights.every((line) => line.length === line.trim().length));
  });

  it("preserves full fallback context on one line", () => {
    const longLine =
      "Last met Apr 12, 2025 at Scotiabank Arena. Toronto won 112-108 in overtime with a late whistle swing.";
    const insight = selectUpcomingCardHeroInsight(
      baseEntry({
        crewCount: 3,
        status: "live",
        gameContextLine: longLine,
      }),
    );
    assert.equal(insight, longLine);
  });

  it("uses matchup briefing context when crews are not assigned", () => {
    const insight = selectUpcomingCardHeroInsight(
      baseEntry({
        crewCount: 0,
        status: "scheduled",
        preview: preview({
          awaitingCrew: true,
          crew: [],
          matchupBriefing: {
            headline: "TOR at BOS matchup sheet",
            lines: ["Raptors and Celtics split their last four meetings."],
            h2hGames: 4,
            avgTotalPoints: 218,
            avgFouls: 41,
            overRate: 0.5,
          },
        }),
        gameContextLine:
          "Last met Apr 12, 2025 at Scotiabank Arena. Toronto won 112-108 in overtime with a late whistle swing.",
      }),
    );
    assert.equal(insight, "Raptors and Celtics split their last four meetings.");
  });
});
