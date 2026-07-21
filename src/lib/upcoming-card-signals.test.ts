import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildUpcomingCardSignals } from "@/lib/upcoming-card-signals";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";

function baseEntry(overrides: Partial<OverviewSlateEntry> = {}): OverviewSlateEntry {
  return {
    leagueId: "wnba",
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    gameId: "401857085",
    matchup: "MIN @ SEA",
    awayTeam: "MIN",
    homeTeam: "SEA",
    crewCount: 3,
    status: "live",
    headRef: "Kevin Fahy",
    ...overrides,
  };
}

function preview(overrides: Partial<GameSlatePreviewPayload> = {}): GameSlatePreviewPayload {
  return {
    gameId: "401857085",
    leagueId: "wnba",
    leagueLabel: "WNBA",
    sport: "wnba",
    basePath: "/wnba",
    matchup: "MIN @ SEA",
    awayTeam: "MIN",
    homeTeam: "SEA",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 82,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 165,
    totalPointsDelta: 2,
    overRate: 0.61,
    avgFouls: 34.4,
    foulsDelta: 2.1,
    crew: [{ name: "Kevin Fahy", number: 43, slug: "kevin-fahy-43" }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("upcoming card signals", () => {
  it("returns a single primary trend line", () => {
    const signals = buildUpcomingCardSignals(
      baseEntry({ preview: preview({ overRate: 0.61, foulsDelta: 2.1 }) }),
    );

    assert.ok(signals.primaryTrend.length > 0);
    assert.ok(["positive", "caution", "neutral"].includes(signals.tone));
  });

  it("falls back to hero copy when crew is not assigned", () => {
    const signals = buildUpcomingCardSignals(
      baseEntry({ crewCount: 0, preview: preview({ awaitingCrew: true, crew: [] }) }),
    );
    assert.ok(signals.primaryTrend.length > 0);
  });
});
