import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildSlateGameIntelligence,
  buildSlateOutlookSummary,
  sortSlateGamesBySignal,
  whistlePersonality,
} from "@/lib/slate-intelligence";

function baseGame(overrides: Partial<OverviewSlateEntry> = {}): OverviewSlateEntry {
  return {
    leagueId: "nba",
    leagueLabel: "NBA",
    leagueShortLabel: "NBA",
    href: "/nba",
    gameId: "g1",
    matchup: "PHO at LAS",
    awayTeam: "PHO",
    homeTeam: "LAS",
    crewCount: 3,
    status: "scheduled",
    headRef: "Scott Foster",
    ...overrides,
  };
}

function preview(overrides: Partial<GameSlatePreviewPayload> = {}): GameSlatePreviewPayload {
  return {
    gameId: "g1",
    leagueId: "nba",
    leagueLabel: "NBA",
    sport: "nba",
    basePath: "/nba",
    matchup: "PHO at LAS",
    awayTeam: "PHoenix Mercury",
    homeTeam: "Los Angeles Sparks",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 528,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 165,
    totalPointsDelta: 2,
    overRate: 0.54,
    avgFouls: 36.1,
    foulsDelta: 2,
    crew: [{ name: "Scott Foster", number: 48, slug: "scott-foster-48", role: "crew_chief" }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("slate intelligence", () => {
  it("classifies whistle personality thresholds", () => {
    assert.equal(whistlePersonality(1.5), "high");
    assert.equal(whistlePersonality(2), "high");
    assert.equal(whistlePersonality(-1.5), "defensive");
    assert.equal(whistlePersonality(0.4), "neutral");
  });

  it("builds outlook summary counts", () => {
    const games = [
      baseGame({
        preview: preview({ foulsDelta: 2 }),
      }),
      baseGame({
        gameId: "g2",
        preview: preview({ foulsDelta: -2 }),
      }),
      baseGame({
        gameId: "g3",
        preview: preview({ foulsDelta: 0.2 }),
      }),
    ];

    const outlook = buildSlateOutlookSummary(games);
    assert.equal(outlook.gamesMonitored, 3);
    assert.equal(outlook.highWhistleCount, 1);
    assert.equal(outlook.defensiveCrewCount, 1);
    assert.ok(outlook.topSignal);
    assert.match(outlook.topSignal!.matchup, /PHO @ LAS/);
  });

  it("sorts live games first then by signal score", () => {
    const scheduled = baseGame({
      gameId: "scheduled",
      preview: preview({ foulsDelta: 3 }),
    });
    const live = baseGame({
      gameId: "live",
      status: "live",
      gamePhase: "live",
      preview: preview({ foulsDelta: 0.5 }),
    });
    const sorted = sortSlateGamesBySignal([scheduled, live]);
    assert.equal(sorted[0]?.gameId, "live");
  });

  it("uses crew chief copy in card intelligence", () => {
    const intel = buildSlateGameIntelligence(
      baseGame({ preview: preview({ foulsDelta: 2.1 }) }),
    );
    assert.equal(intel.crewChiefName, "Scott Foster");
    assert.match(intel.verdictHeadline, /high whistle/i);
    assert.ok(intel.confidencePct > 0);
  });
});
