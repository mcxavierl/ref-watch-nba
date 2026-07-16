import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MARQUEE_CI_MIN_GAMES,
  computeRefMarqueePerformance,
  scanLeagueMarqueeEfficiency,
} from "@/lib/marquee-metrics";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefProfile } from "@/lib/types";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";

const PROFILE: RefProfile = {
  slug: "test-ref-42",
  name: "Test Ref",
  number: 42,
  games: 40,
  avgTotalPoints: 45,
  overRate: 0.5,
  avgFouls: 12,
  homeCoverRate: null,
  totalPointsDelta: 0,
  foulsDelta: 0,
  seasons: ["2024-25"],
  recentGames: [],
};

function nflGame(
  id: string,
  date: string,
  totalPoints: number,
  closingTotal: number,
  opts?: {
    homeTeam?: string;
    awayTeam?: string;
    homeSpread?: number;
    officials?: RuntimeGameLogEntry["officials"];
  },
): RuntimeGameLogEntry {
  return {
    gameId: id,
    date,
    season: "2024-25",
    league: "NFL",
    homeTeam: opts?.homeTeam ?? "NYJ",
    awayTeam: opts?.awayTeam ?? "HOU",
    homeScore: 24,
    awayScore: 21,
    totalPoints,
    totalFouls: 10,
    closingTotal,
    homeSpread: opts?.homeSpread ?? 7,
    lineSource: "external",
    officials:
      opts?.officials ?? [{ name: "Test Ref", number: 42, role: "referee" }],
  };
}

describe("computeRefMarqueePerformance", () => {
  it("splits marquee Thursday games from baseline sample", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games: RuntimeGameLogEntry[] = [
      ...Array.from({ length: 12 }, (_, i) =>
        nflGame(`thu-${i}`, "2024-09-12", 50, 44),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        nflGame(`tue-${i}`, "2024-09-10", 40, 44),
      ),
    ];

    const result = computeRefMarqueePerformance("nfl", PROFILE, games);
    assert.ok(result);
    assert.equal(result.marqueeGames, 12);
    assert.equal(result.baselineGames, 12);
    assert.ok(result.marqueeOverRate > result.baselineOverRate);
    assert.equal(result.refSlug, PROFILE.slug);
  });

  it("emits Wilson CI when marquee sample exceeds threshold", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games = Array.from({ length: MARQUEE_CI_MIN_GAMES + 2 }, (_, i) =>
      nflGame(`thu-${i}`, "2024-09-12", 50, 44),
    );

    const result = computeRefMarqueePerformance("nfl", PROFILE, games);
    assert.ok(result);
    assert.ok(result.marqueeGames > MARQUEE_CI_MIN_GAMES);
    assert.ok(result.overRateCi);
    assert.match(result.overRateCi!.label, /%/);
  });
});

describe("scanLeagueMarqueeEfficiency", () => {
  it("returns the ref with the largest marquee-vs-baseline over split", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games: RuntimeGameLogEntry[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        nflGame(`a-thu-${i}`, "2024-09-12", 55, 44),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        nflGame(`a-tue-${i}`, "2024-09-10", 40, 44),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        nflGame(`b-thu-${i}`, "2024-09-12", 46, 44),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        nflGame(`b-tue-${i}`, "2024-09-10", 45, 44),
      ),
    ];

    const otherRef: RefProfile = {
      ...PROFILE,
      slug: "other-ref-7",
      name: "Other Ref",
      number: 7,
    };

    for (const game of games.slice(20)) {
      game.officials = [{ name: "Other Ref", number: 7, role: "referee" }];
    }

    const scan = scanLeagueMarqueeEfficiency("nfl", [PROFILE, otherRef], games);
    assert.ok(scan);
    assert.equal(scan.refSlug, PROFILE.slug);
    assert.ok(Math.abs(scan.deltaOverPp) >= 6);
  });

  it("skips refs with no non-marquee baseline sample", () => {
    getWorkerIsolateStore().matrixCompute.clear();

    const games = Array.from({ length: 12 }, (_, i) =>
      nflGame(`thu-${i}`, "2024-09-12", 55, 44),
    );

    const scan = scanLeagueMarqueeEfficiency("nfl", [PROFILE], games);
    assert.equal(scan, null);
  });
});
