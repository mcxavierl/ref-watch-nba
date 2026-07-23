import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildHistoricalMatchupBaseline,
  buildSlateGameIntelligence,
  buildSlateOutlookSummary,
  hasRefAssignments,
  signalTierFromConfidence,
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
    assert.match(intel.signalTierLabel, /^\[/);
  });

  it("computes real confidence when crew sample gate is partial", () => {
    const intel = buildSlateGameIntelligence(
      baseGame({
        preview: preview({
          insufficientSample: true,
          sampleGames: 46,
          avgFouls: 35.3,
          foulsDelta: 1.3,
        }),
      }),
    );

    assert.notEqual(intel.confidencePct, 42);
    assert.notEqual(intel.evidenceScore, 4.2);
    assert.ok(intel.confidencePct > 0);
    assert.ok(intel.evidenceScore > 0);
    assert.equal(intel.expectedWhistles > 0, true);
  });

  it("returns zeroed fallback when preview has no actionable metrics", () => {
    const intel = buildSlateGameIntelligence(
      baseGame({
        headRef: undefined,
        crewCount: 0,
        preview: preview({
          insufficientSample: true,
          sampleGames: 0,
          avgFouls: 0,
          foulsDelta: 0,
          crew: [],
          awaitingCrew: true,
        }),
      }),
    );

    assert.equal(intel.confidencePct, 0);
    assert.equal(intel.evidenceScore, 0);
    assert.equal(intel.signalTierLabel, "CREW PENDING");
  });

  it("suppresses whistle model metrics when crew is pending", () => {
    const intel = buildSlateGameIntelligence(
      baseGame({
        crewCount: 0,
        headRef: undefined,
        preview: preview({
          awaitingCrew: true,
          crew: [],
          sampleGames: 12,
          avgFouls: 34.2,
          foulsDelta: -1.8,
          avgTotalPoints: 168,
          totalPointsDelta: 4.5,
          overRate: 0.58,
          matchupBriefing: {
            headline: "PHO at LAS matchup sheet",
            lines: ["Last meeting: PHO 81, LAS 77"],
            h2hGames: 4,
            avgTotalPoints: 165,
            avgFouls: 33.5,
            overRate: 0.5,
            lastMeeting: "Last meeting: PHO 81, LAS 77",
          },
        }),
      }),
    );

    assert.equal(hasRefAssignments(baseGame({
      crewCount: 0,
      headRef: undefined,
      preview: preview({ awaitingCrew: true, crew: [] }),
    })), false);
    assert.equal(intel.expectedWhistles, 0);
    assert.equal(intel.confidencePct, 0);
    assert.equal(intel.evidenceScore, 0);
    assert.equal(intel.whistleDelta, 0);
    assert.equal(intel.signalTierLabel, "CREW PENDING");
  });

  it("builds historical matchup baseline from preview briefing", () => {
    const baseline = buildHistoricalMatchupBaseline(
      baseGame({
        awayTeam: "PHO",
        homeTeam: "LAS",
        preview: preview({
          awaitingCrew: true,
          crew: [],
          matchupBriefing: {
            headline: "PHO at LAS matchup sheet",
            lines: ["Last meeting: PHO 81, LAS 77"],
            h2hGames: 4,
            avgTotalPoints: 165,
            avgFouls: 33.5,
            overRate: 0.52,
            lastMeeting: "Last meeting: PHO 81, LAS 77",
          },
        }),
      }),
    );

    assert.equal(baseline.title, "HISTORICAL TEAM MATCHUP");
    assert.match(baseline.lines[0]!, /Last 4 meetings:/);
    assert.match(baseline.lines[1]!, /PHO vs LAS/);
  });

  it("maps confidence and delta to explicit signal tiers", () => {
    const high = signalTierFromConfidence(82, 2.1);
    assert.equal(high.tier, "high");
    assert.equal(high.label, "[HIGH SIGNAL]");
    const standard = signalTierFromConfidence(40, 0.2);
    assert.equal(standard.tier, "standard");
  });
});
