import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANOMALY_Z_THRESHOLD,
  assertObservationalCopy,
  computeSeverityScore,
  detectAnomalies,
  mapSeverityLevel,
  pickBestRollingWindow,
} from "@/lib/analytics/anomalyEngine";
import type { RefGameRecord, RefProfile } from "@/lib/types";

function game(overrides: Partial<RefGameRecord> = {}): RefGameRecord {
  return {
    gameId: overrides.gameId ?? "g1",
    date: overrides.date ?? "2026-01-01",
    season: overrides.season ?? "2025-26",
    homeTeam: "HOM",
    awayTeam: "AWY",
    totalPoints: overrides.totalPoints ?? 220,
    totalFouls: overrides.totalFouls ?? 42,
    overHit: true,
    raptorsInvolved: false,
    ...overrides,
  };
}

function profile(recentGames: RefGameRecord[]): RefProfile {
  return {
    slug: "ref-1",
    name: "Ref One",
    number: 1,
    games: recentGames.length,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 42,
    homeCoverRate: null,
    totalPointsDelta: 2,
    foulsDelta: 1,
    seasons: ["2025-26"],
    recentGames,
  };
}

describe("anomalyEngine", () => {
  it("picks the smallest rolling window with enough sample", () => {
    const games = Array.from({ length: 30 }, (_, index) =>
      game({ gameId: `g${index}`, totalFouls: 40 + (index % 3) }),
    );
    const picked = pickBestRollingWindow(games, "2025-26");
    assert.equal(picked.window, "last_25_games");
    assert.equal(picked.games.length, 25);
  });

  it("maps severity score to INFO, HIGH, and CRITICAL bands", () => {
    assert.equal(mapSeverityLevel(25), "INFO");
    assert.equal(mapSeverityLevel(55), "HIGH");
    assert.equal(mapSeverityLevel(82), "CRITICAL");
  });

  it("computes composite severity score from z-score inputs", () => {
    const score = computeSeverityScore({
      crewDeviationZ: 3,
      tempoDeviationZ: 2,
      marketDivergenceZ: 1.5,
      sampleSize: 40,
    });
    assert.ok(score >= 40);
    assert.ok(score <= 100);
  });

  it("rejects judgmental observational copy", () => {
    assert.throws(() => assertObservationalCopy("The ref was biased tonight."));
  });

  it("detects crew foul deviation above z threshold", () => {
    const recentGames = Array.from({ length: 25 }, (_, index) =>
      game({
        gameId: `g${index}`,
        totalFouls: index >= 20 ? 62 : 38,
        totalPoints: 220,
      }),
    );
    const anomalies = detectAnomalies({
      leagueId: "nba",
      game: {
        id: "401000001",
        matchup: "BOS @ LAL",
        awayTeam: "BOS",
        homeTeam: "LAL",
        league: "NBA",
        crew: [{ name: "Scott Foster", number: 48, role: "referee" }],
      },
      crewProfiles: [profile(recentGames)],
      leagueAvgTotal: 220,
      leagueAvgFouls: 40,
      benchmarkTotal: 225,
      lineLag: 6.5,
      currentSeason: "2025-26",
    });

    assert.ok(anomalies.length >= 1);
    const flagged = anomalies[0];
    assert.ok(flagged);
    assert.ok(
      flagged.type === "LINE_MOVEMENT_DIVERGENCE" ||
        flagged.severityScore >= 40 ||
        Math.abs(flagged.zScore) >= ANOMALY_Z_THRESHOLD,
    );
    assert.match(flagged.summary, /divergence|baseline|profile/i);
  });
});
