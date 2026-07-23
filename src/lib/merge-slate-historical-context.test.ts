import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLiveSlateGamesWithSeed } from "@/lib/merge-slate-historical-context";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  buildHistoricalMatchupBaseline,
  PENDING_EMPTY_H2H_COPY,
} from "@/lib/slate-intelligence";

function slateEntry(
  overrides: Partial<OverviewSlateEntry> = {},
): OverviewSlateEntry {
  return {
    leagueId: "wnba",
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    gameId: "wnba-test-1",
    matchup: "CON @ WAS",
    awayTeam: "CON",
    homeTeam: "WAS",
    crewCount: 0,
    status: "scheduled",
    slateDate: "2026-07-23",
    ...overrides,
  };
}

describe("merge slate historical context", () => {
  it("preserves seeded matchup context when polled slate rebuild loses head-to-head", () => {
    const seed = slateEntry({
      matchupInsight:
        "Last 5 seasons (8 meetings): avg 160.0 total points and 40.5 fouls per game.",
      preview: {
        gameId: "wnba-test-1",
        leagueId: "wnba",
        leagueLabel: "WNBA",
        sport: "wnba",
        basePath: "/wnba",
        matchup: "CON @ WAS",
        awayTeam: "CON",
        homeTeam: "WAS",
        awayAbbr: "CON",
        homeAbbr: "WAS",
        ouLean: "neutral",
        awaitingCrew: true,
        insufficientSample: false,
        sampleGames: 8,
        scoringLabel: "Scoring",
        whistleLabel: "Whistles",
        avgTotalPoints: 160,
        totalPointsDelta: 0,
        overRate: 0.5,
        avgFouls: 40.5,
        foulsDelta: 0,
        crew: [],
        refTeamRows: [],
        teamImpacts: [],
        storylines: [],
        matchupBriefing: {
          headline: "CON at WAS matchup sheet",
          lines: [
            "Last 5 seasons (8 meetings): avg 160.0 total points and 40.5 fouls per game.",
          ],
          h2hGames: 8,
          avgTotalPoints: 160,
          avgFouls: 40.5,
          overRate: 0.5,
        },
      },
    });

    const polled = slateEntry({
      awayScore: 10,
      preview: {
        ...seed.preview!,
        sampleGames: 0,
        matchupBriefing: {
          headline: "CON at WAS matchup sheet",
          lines: ["CON at WAS: no published head-to-head sample yet. Check back when logs refresh."],
          h2hGames: 0,
          avgTotalPoints: 0,
          avgFouls: 0,
          overRate: 0.5,
        },
      },
    });

    const merged = mergeLiveSlateGamesWithSeed([polled], [seed])[0]!;
    const baseline = buildHistoricalMatchupBaseline(merged);

    assert.equal(baseline.isEmptyFallback, false);
    assert.doesNotMatch(baseline.lines.join(" "), /no recent head-to-head/i);
    assert.match(baseline.lines[0] ?? "", /Last 5 meetings/);
  });

  it("keeps richer polled context when live rebuild succeeds", () => {
    const seed = slateEntry({
      preview: {
        gameId: "wnba-test-1",
        leagueId: "wnba",
        leagueLabel: "WNBA",
        sport: "wnba",
        basePath: "/wnba",
        matchup: "CON @ WAS",
        awayTeam: "CON",
        homeTeam: "WAS",
        awayAbbr: "CON",
        homeAbbr: "WAS",
        ouLean: "neutral",
        awaitingCrew: true,
        insufficientSample: true,
        sampleGames: 0,
        scoringLabel: "Scoring",
        whistleLabel: "Whistles",
        avgTotalPoints: 0,
        totalPointsDelta: 0,
        overRate: 0.5,
        avgFouls: 0,
        foulsDelta: 0,
        crew: [],
        refTeamRows: [],
        teamImpacts: [],
        storylines: [],
        matchupBriefing: {
          headline: "CON at WAS matchup sheet",
          lines: [PENDING_EMPTY_H2H_COPY],
          h2hGames: 0,
          avgTotalPoints: 0,
          avgFouls: 0,
          overRate: 0.5,
        },
      },
    });

    const polled = slateEntry({
      preview: {
        ...seed.preview!,
        sampleGames: 8,
        avgTotalPoints: 160,
        avgFouls: 40.5,
        matchupBriefing: {
          headline: "CON at WAS matchup sheet",
          lines: ["Last 5 seasons (8 meetings): avg 160.0 total points and 40.5 fouls per game."],
          h2hGames: 8,
          avgTotalPoints: 160,
          avgFouls: 40.5,
          overRate: 0.5,
        },
      },
    });

    const merged = mergeLiveSlateGamesWithSeed([polled], [seed])[0]!;
    const baseline = buildHistoricalMatchupBaseline(merged);

    assert.equal(baseline.isEmptyFallback, false);
    assert.match(baseline.lines[0] ?? "", /Last 5 meetings/);
  });
});
