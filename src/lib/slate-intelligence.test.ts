import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildHistoricalMatchupBaseline,
  buildSlateGameIntelligence,
  buildSlateOutlookSummary,
  formatSlateGameStatusLabel,
  hasRefAssignments,
  PENDING_EMPTY_H2H_COPY,
  partitionHomepageSlateGames,
  pendingCrewSignalTier,
  sanitizePendingMatchupLines,
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
    assert.equal(outlook.liveAndAssignedMonitored, 3);
    assert.equal(outlook.pendingCrewCount, 0);
    assert.equal(outlook.highWhistleCount, 1);
    assert.equal(outlook.defensiveCrewCount, 1);
    assert.ok(outlook.topSignal);
    assert.match(outlook.topSignal!.matchup, /PHO @ LAS/);
  });

  it("excludes pending crew games from outlook confidence averages", () => {
    const assigned = baseGame({
      gameId: "assigned",
      preview: preview({ foulsDelta: 2 }),
    });
    const pending = baseGame({
      gameId: "pending",
      crewCount: 0,
      headRef: undefined,
      preview: preview({
        awaitingCrew: true,
        crew: [],
        sampleGames: 0,
        avgFouls: 0,
        foulsDelta: 0,
      }),
    });

    const outlook = buildSlateOutlookSummary([assigned, pending]);
    assert.equal(outlook.liveAndAssignedMonitored, 1);
    assert.equal(outlook.pendingCrewCount, 1);
    assert.notEqual(outlook.avgConfidencePct, null);
    assert.ok((outlook.avgConfidencePct ?? 0) > 0);
  });

  it("formats live status without duplicating period labels", () => {
    assert.equal(
      formatSlateGameStatusLabel(
        baseGame({
          status: "live",
          gamePhase: "live",
          gamePeriod: "Q4",
          gameClock: "Q4 6:43",
        }),
      ),
      "LIVE · Q4 6:43",
    );
    assert.equal(
      formatSlateGameStatusLabel(
        baseGame({
          status: "live",
          gamePhase: "live",
          gameClock: "Halftime",
        }),
      ),
      "LIVE · Half",
    );
    assert.equal(
      formatSlateGameStatusLabel(
        baseGame({
          status: "final",
          gamePhase: "final",
        }),
      ),
      "FINAL",
    );
    assert.match(
      formatSlateGameStatusLabel(
        baseGame({
          slateDate: "2026-07-28",
          slateStartAt: "2026-07-28T23:30:00.000Z",
        }),
      ),
      /^JUL 28 · /,
    );
  });

  it("forces pending crew games into the crew pending signal tier", () => {
    const game = baseGame({
      crewCount: 0,
      headRef: undefined,
      preview: preview({
        awaitingCrew: true,
        crew: [],
        foulsDelta: 2.4,
      }),
    });
    const intel = buildSlateGameIntelligence(game);

    assert.equal(hasRefAssignments(game), false);
    assert.equal(intel.signalTier, "pending");
    assert.equal(intel.signalTierLabel, "[CREW PENDING]");
  });

  it("partitions pending crew games into the secondary homepage section", () => {
    const assigned = baseGame({ gameId: "assigned", preview: preview({ foulsDelta: 1.2 }) });
    const pending = baseGame({
      gameId: "pending",
      crewCount: 0,
      headRef: undefined,
      preview: preview({ awaitingCrew: true, crew: [], foulsDelta: 0 }),
    });
    const finalGame = baseGame({
      gameId: "final",
      status: "final",
      gamePhase: "final",
      preview: preview({ foulsDelta: 0.5 }),
    });

    const { primaryGames, pendingGames } = partitionHomepageSlateGames([
      pending,
      finalGame,
      assigned,
    ]);

    assert.deepEqual(
      primaryGames.map((game) => game.gameId),
      ["assigned", "final"],
    );
    assert.deepEqual(
      pendingGames.map((game) => game.gameId),
      ["pending"],
    );
  });

  it("sorts live games first then assigned today, finals, and pending last", () => {
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
    const pending = baseGame({
      gameId: "pending",
      crewCount: 0,
      headRef: undefined,
      preview: preview({ awaitingCrew: true, crew: [], foulsDelta: 0 }),
    });
    const finalGame = baseGame({
      gameId: "final",
      status: "final",
      gamePhase: "final",
      preview: preview({ foulsDelta: 0.2 }),
    });

    const sorted = sortSlateGamesBySignal([pending, finalGame, scheduled, live]);
    assert.deepEqual(
      sorted.map((game) => game.gameId),
      ["live", "scheduled", "final", "pending"],
    );
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
  });

  it("maps confidence and delta to explicit signal tiers", () => {
    const high = signalTierFromConfidence(82, 2.1);
    assert.equal(high.tier, "high");
    assert.equal(high.label, "[HIGH SIGNAL]");
    const pending = pendingCrewSignalTier();
    assert.equal(pending.label, "[CREW PENDING]");
    const elevated = signalTierFromConfidence(60, 1.4);
    assert.equal(elevated.tier, "elevated");
    const lowConfidenceHighDelta = signalTierFromConfidence(35, 1.4);
    assert.equal(lowConfidenceHighDelta.tier, "standard");
    const standard = signalTierFromConfidence(40, 0.2);
    assert.equal(standard.tier, "standard");
  });

  it("builds historical matchup baseline from slate entry context", () => {
    const baseline = buildHistoricalMatchupBaseline(
      baseGame({
        matchupInsight: "These teams average 152 points in their last 3 meetings.",
        preview: preview({
          awaitingCrew: true,
          crew: [],
          sampleGames: 3,
          avgTotalPoints: 152,
          avgFouls: 34,
          overRate: 0.58,
          matchupBriefing: {
            headline: "PHO at LAS matchup sheet",
            lines: [],
            h2hGames: 3,
            avgTotalPoints: 152,
            avgFouls: 34,
            overRate: 0.58,
          },
        }),
      }),
    );

    assert.match(baseline.lines[0] ?? "", /Last 3 meetings/);
    assert.match(baseline.lines[1] ?? "", /Head-to-head record/);
  });

  it("falls back to preview sampleGames when briefing h2hGames is zero", () => {
    const baseline = buildHistoricalMatchupBaseline(
      baseGame({
        preview: preview({
          awaitingCrew: true,
          crew: [],
          sampleGames: 4,
          avgTotalPoints: 165,
          avgFouls: 34.8,
          overRate: 0.5,
          matchupBriefing: {
            headline: "GSV at PHO matchup sheet",
            lines: [],
            h2hGames: 0,
            avgTotalPoints: 165,
            avgFouls: 34.8,
            overRate: 0.5,
          },
        }),
      }),
    );

    assert.equal(baseline.isEmptyFallback, false);
    assert.match(baseline.lines[0] ?? "", /Last 4 meetings/);
  });

  it("collapses repeated no-recent-log fallback lines on pending cards", () => {
    const baseline = sanitizePendingMatchupLines([
      "LVA: no recent WNBA log on file",
      "TOR: no recent WNBA log on file",
      "Recent form: LVA: no recent WNBA log on file · TOR: no recent WNBA log on file",
    ]);

    assert.equal(baseline.isEmptyFallback, true);
    assert.deepEqual(baseline.lines, [PENDING_EMPTY_H2H_COPY]);
  });

  it("keeps meaningful recent form when only one side has logs", () => {
    const baseline = sanitizePendingMatchupLines([
      "Recent form: LVA: no recent WNBA log on file · TOR beat MIN 84-79 away on Jul 18, 2026",
    ]);

    assert.equal(baseline.isEmptyFallback, false);
    assert.match(baseline.lines[0] ?? "", /Recent form: TOR beat MIN/);
    assert.doesNotMatch(baseline.lines[0] ?? "", /no recent WNBA log on file/);
  });

  it("uses WNBA All-Star event copy instead of empty head-to-head fallback", () => {
    const baseline = buildHistoricalMatchupBaseline(
      baseGame({
        leagueId: "wnba",
        leagueLabel: "WNBA",
        leagueShortLabel: "WNBA",
        href: "/wnba",
        matchup: "SPO @ COOP",
        awayTeam: "SPO",
        homeTeam: "COOP",
        preview: preview({
          leagueId: "wnba",
          sport: "wnba",
          basePath: "/wnba",
          matchup: "SPO @ COOP",
          awayTeam: "SPO",
          homeTeam: "COOP",
          awayAbbr: "SPO",
          homeAbbr: "COOP",
          awaitingCrew: true,
          crew: [],
          matchupBriefing: {
            headline: "WNBA ALL-STAR GAME",
            lines: [
              "WNBA ALL-STAR GAME · SPO vs COOP exhibition rosters.",
              "All-Star showcase event - franchise head-to-head history does not apply.",
            ],
            h2hGames: 0,
            avgTotalPoints: 0,
            avgFouls: 0,
            overRate: 0.5,
          },
        }),
      }),
    );

    assert.equal(baseline.title, "WNBA ALL-STAR GAME");
    assert.equal(baseline.isEmptyFallback, false);
    assert.doesNotMatch(baseline.lines.join(" "), /No recent head-to-head matchups on file/i);
  });

  it("returns null average confidence when no assigned slate has model output", () => {
    const outlook = buildSlateOutlookSummary([
      baseGame({
        gameId: "pending-1",
        crewCount: 0,
        headRef: undefined,
        preview: preview({
          awaitingCrew: true,
          crew: [],
          sampleGames: 0,
          avgFouls: 0,
          foulsDelta: 0,
        }),
      }),
    ]);

    assert.equal(outlook.avgConfidencePct, null);
    assert.equal(outlook.pendingCrewCount, 1);
  });

  it("prefers preview briefing lines before empty head-to-head fallback", () => {
    const baseline = buildHistoricalMatchupBaseline(
      baseGame({
        leagueId: "wnba",
        leagueLabel: "WNBA",
        leagueShortLabel: "WNBA",
        href: "/wnba",
        matchup: "TOR @ MIN",
        awayTeam: "TOR",
        homeTeam: "MIN",
        teamContextLine:
          "Recent form: TOR: no recent WNBA log on file · MIN beat GSV 72-53 at home (Sep 12, 2025)",
        preview: preview({
          leagueId: "wnba",
          sport: "wnba",
          basePath: "/wnba",
          matchup: "TOR @ MIN",
          awayTeam: "TOR",
          homeTeam: "MIN",
          awayAbbr: "TOR",
          homeAbbr: "MIN",
          awaitingCrew: true,
          crew: [],
          sampleGames: 0,
          matchupBriefing: {
            headline: "TOR at MIN matchup sheet",
            lines: [
              "Recent form: TOR: no recent WNBA log on file · MIN beat GSV 72-53 at home (Sep 12, 2025)",
            ],
            h2hGames: 0,
            avgTotalPoints: 0,
            avgFouls: 0,
            overRate: 0.5,
          },
        }),
      }),
    );

    assert.equal(baseline.isEmptyFallback, false);
    assert.match(baseline.lines[0] ?? "", /MIN beat GSV/);
  });
});
