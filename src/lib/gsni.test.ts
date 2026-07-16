import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  buildGsniCorpusFromGameLogs,
  calculateLeverageWeight,
  computeGSNI,
  extractGsniObservations,
  type GsniGamesCorpus,
} from "@/lib/gsni";

describe("calculateLeverageWeight", () => {
  it("returns 1.0 for high-leverage game states", () => {
    assert.equal(calculateLeverageWeight(3, 240), 1);
    assert.equal(calculateLeverageWeight(-4, 120), 1);
  });

  it("returns 0.1 for low-leverage game states", () => {
    assert.equal(calculateLeverageWeight(20, 900), 0.1);
    assert.equal(calculateLeverageWeight(-18, 1200), 0.1);
  });

  it("interpolates between leverage extremes", () => {
    const mid = calculateLeverageWeight(10, 450);
    assert.ok(mid > 0.1 && mid < 1);
  });

  it("clamps output to [0.1, 1.0]", () => {
    const value = calculateLeverageWeight(0, 0);
    assert.ok(value >= 0.1 && value <= 1);
  });
});

describe("computeGSNI", () => {
  const highLeverageObservation = {
    scoreDifferential: 2,
    timeRemainingSeconds: 180,
    fouls: 4,
    minutes: 12,
  };

  const lowLeverageObservation = {
    scoreDifferential: 20,
    timeRemainingSeconds: 1500,
    fouls: 8,
    minutes: 24,
  };

  function corpusForRef(
    refId: string,
    refObservations: typeof highLeverageObservation[],
    leagueExtraGames = 0,
  ): GsniGamesCorpus {
    const games = [
      {
        gameId: "g-ref",
        refereeIds: [refId, "other-ref"],
        observations: refObservations,
      },
    ];

    for (let i = 0; i < leagueExtraGames; i += 1) {
      games.push({
        gameId: `g-league-${i}`,
        refereeIds: ["other-ref"],
        observations: [
          {
            scoreDifferential: 2,
            timeRemainingSeconds: 180,
            fouls: 3,
            minutes: 12,
          },
          lowLeverageObservation,
        ],
      });
    }

    return { games };
  }

  it("returns null GSNI when high-leverage minutes are below the honesty gate", () => {
    const result = computeGSNI(
      "scott-foster-48",
      corpusForRef("scott-foster-48", [
        {
          scoreDifferential: 2,
          timeRemainingSeconds: 180,
          fouls: 2,
          minutes: 8,
        },
      ]),
    );

    assert.equal(result.referee_gsni, undefined);
    assert.equal(result.referee_gsni_volatility, undefined);
    assert.ok(result.highLeverageMinutes < GSNI_MIN_HIGH_LEVERAGE_MINUTES);
  });

  it("returns neutral GSNI near 50 when ref matches league state rates", () => {
    const refId = "tony-brothers-25";
    const shared = [
      highLeverageObservation,
      highLeverageObservation,
      highLeverageObservation,
      highLeverageObservation,
      highLeverageObservation,
    ];

    const corpus: GsniGamesCorpus = {
      games: [
        { gameId: "g1", refereeIds: [refId], observations: shared },
        { gameId: "g2", refereeIds: ["peer-ref"], observations: shared },
      ],
    };

    const result = computeGSNI(refId, corpus);
    assert.ok(result.highLeverageMinutes >= GSNI_MIN_HIGH_LEVERAGE_MINUTES);
    assert.ok(result.referee_gsni !== undefined);
    assert.ok(Math.abs((result.referee_gsni ?? 0) - 50) < 5);
  });

  it("returns lower GSNI when ref whistles more than league in the same states", () => {
    const refId = "heavy-whistle";
    const heavyObs = Array.from({ length: 5 }, () => ({
      ...highLeverageObservation,
      fouls: 10,
    }));
    const lightObs = Array.from({ length: 5 }, () => ({
      ...highLeverageObservation,
      fouls: 2,
    }));
    const corpus: GsniGamesCorpus = {
      games: [
        {
          gameId: "g-ref-heavy-1",
          refereeIds: [refId],
          observations: heavyObs,
        },
        {
          gameId: "g-ref-heavy-2",
          refereeIds: [refId],
          observations: heavyObs,
        },
        {
          gameId: "g-league-light",
          refereeIds: ["peer-ref"],
          observations: lightObs,
        },
      ],
    };

    const result = computeGSNI(refId, corpus);
    assert.ok(result.referee_gsni !== undefined);
    assert.ok((result.referee_gsni ?? 100) < 50);
    assert.ok(result.referee_gsni_volatility !== undefined);
  });
});

describe("extractGsniObservations", () => {
  it("prefers whistle period splits when present", () => {
    const observations = extractGsniObservations({
      gameId: "nba-1",
      homeScore: 102,
      awayScore: 99,
      totalFouls: 42,
      officials: [],
      whistlePeriodSplits: {
        unit: "quarter",
        source: "boxscore",
        buckets: [
          { period: 1, home: 5, away: 4 },
          { period: 4, home: 6, away: 7 },
        ],
      },
    });

    assert.equal(observations.length, 2);
    assert.equal(observations[0]?.fouls, 9);
    assert.equal(observations[1]?.timeRemainingSeconds, 360);
  });

  it("builds corpus from game logs with official slug mapping", () => {
    const corpus = buildGsniCorpusFromGameLogs(
      [
        {
          gameId: "nba-2",
          homeScore: 110,
          awayScore: 108,
          totalFouls: 44,
          officials: [{ name: "Scott Foster", number: 48, role: "referee" }],
        },
      ],
      (official) => `${official.name}-${official.number}`,
    );

    assert.equal(corpus.games.length, 1);
    assert.equal(corpus.games[0]?.refereeIds[0], "Scott Foster-48");
    assert.equal(corpus.games[0]?.observations.length, 1);
  });
});
