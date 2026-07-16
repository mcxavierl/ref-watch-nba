import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "@/lib/leagues";
import {
  buildRefPreviewQuickSummary,
  buildWhistleSparklineSeries,
  metricHonestyHint,
} from "@/lib/ref-profile-preview";
import type { RefProfile } from "@/lib/types";

function sampleRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test-ref-1",
    name: "Test Official",
    number: 12,
    games: 45,
    avgTotalPoints: 228,
    overRate: 0.54,
    avgFouls: 24.5,
    homeCoverRate: null,
    totalPointsDelta: 2.4,
    foulsDelta: -1.8,
    seasons: ["2024-25"],
    recentGames: [
      {
        gameId: "g1",
        date: "2025-03-01",
        season: "2024-25",
        homeTeam: "LAL",
        awayTeam: "BOS",
        totalPoints: 220,
        totalFouls: 38,
        overHit: true,
        raptorsInvolved: false,
        highLeverageFlagRate: 0.42,
      },
      {
        gameId: "g2",
        date: "2025-03-05",
        season: "2024-25",
        homeTeam: "MIA",
        awayTeam: "NYK",
        totalPoints: 210,
        totalFouls: 44,
        overHit: false,
        raptorsInvolved: false,
        highLeverageFlagRate: 0.38,
      },
      {
        gameId: "g3",
        date: "2025-03-08",
        season: "2024-25",
        homeTeam: "GSW",
        awayTeam: "PHX",
        totalPoints: 235,
        totalFouls: 48,
        overHit: true,
        raptorsInvolved: false,
      },
    ],
    teamStats: {},
    ...overrides,
  };
}

describe("ref profile preview helpers", () => {
  it("formats metric honesty hints", () => {
    const hint = metricHonestyHint({
      sampleSize: 45,
      leagueAvg: 25.2,
      leagueAvgLabel: "League Avg",
      effectMagnitude: 2,
    });
    assert.match(hint, /Sample Size: 45 Games/);
    assert.match(hint, /League Avg: 25\.2/);
    assert.match(hint, /Data Maturity:/);
  });

  it("builds whistle sparkline points from recent games", () => {
    const league = LEAGUES.nba;
    const points = buildWhistleSparklineSeries(sampleRef().recentGames, league, 3);
    assert.equal(points.length, 3);
    assert.equal(points[0]!.value, 38);
    assert.equal(points[2]!.value, 48);
  });

  it("builds a multi-sentence quick summary", () => {
    const summary = buildRefPreviewQuickSummary({
      profile: sampleRef(),
      league: LEAGUES.nba,
      leagueAvgFouls: 26.3,
      leagueAvgTotal: 225.6,
    });
    assert.ok(summary.split(".").filter(Boolean).length >= 3);
    assert.match(summary, /Test Official/);
  });
});
