import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectScoringRuns,
  finalizeMomentumKillerScores,
  leagueRunStoppageBaseline,
  momentumKillerLabelFromScore,
  normalizeMomentumKillerScore,
  summarizeMomentumRuns,
  computeRawRunStoppageRate,
  computeMomentumKillerIndex,
} from "@/lib/analytics/momentum-killer-score";

describe("detectScoringRuns", () => {
  it("detects 8+ unanswered points", () => {
    const runs = detectScoringRuns(
      "LAL",
      "BOS",
      [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "LAL", points: 3, gameSecondsElapsed: 120 },
        { team: "LAL", points: 3, gameSecondsElapsed: 140 },
      ],
      [],
    );

    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.runningPoints, 8);
    assert.equal(runs[0]?.endedByCrewStoppage, false);
  });

  it("detects 10-2 runs inside a three-minute window", () => {
    const runs = detectScoringRuns(
      "LAL",
      "BOS",
      [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "BOS", points: 2, gameSecondsElapsed: 150 },
        { team: "LAL", points: 3, gameSecondsElapsed: 200 },
        { team: "LAL", points: 3, gameSecondsElapsed: 230 },
        { team: "LAL", points: 2, gameSecondsElapsed: 260 },
        { team: "LAL", points: 2, gameSecondsElapsed: 270 },
      ],
      [],
    );

    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.runningPoints, 10);
    assert.equal(runs[0]?.opposingPoints, 0);
  });

  it("flags crew stoppages that end a qualifying run", () => {
    const runs = detectScoringRuns(
      "LAL",
      "BOS",
      [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "LAL", points: 3, gameSecondsElapsed: 120 },
        { team: "LAL", points: 3, gameSecondsElapsed: 140 },
        { team: "BOS", points: 2, gameSecondsElapsed: 160 },
      ],
      [
        {
          kind: "subjective-foul",
          team: "LAL",
          gameSecondsElapsed: 155,
        },
      ],
    );

    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.endedByCrewStoppage, true);
    assert.equal(runs[0]?.stoppageKind, "subjective-foul");
  });

  it("ignores mandatory fouls as interruptions", () => {
    const runs = detectScoringRuns(
      "LAL",
      "BOS",
      [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "LAL", points: 3, gameSecondsElapsed: 120 },
        { team: "LAL", points: 3, gameSecondsElapsed: 140 },
        { team: "BOS", points: 2, gameSecondsElapsed: 160 },
      ],
      [
        {
          kind: "mandatory-foul",
          team: "LAL",
          gameSecondsElapsed: 155,
          mandatory: true,
        },
      ],
    );

    assert.equal(runs[0]?.endedByCrewStoppage, false);
  });
});

describe("momentum killer aggregation", () => {
  it("computes run stoppage rate across games", () => {
    const gameTemplate = (interrupted: boolean) => ({
      homeTeam: "LAL",
      awayTeam: "BOS",
      scoringPlays: [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "LAL", points: 3, gameSecondsElapsed: 120 },
        { team: "LAL", points: 3, gameSecondsElapsed: 140 },
        { team: "BOS", points: 2, gameSecondsElapsed: 160 },
      ],
      crewStoppages: interrupted
        ? [
            {
              kind: "technical" as const,
              team: "LAL",
              gameSecondsElapsed: 155,
            },
          ]
        : [],
    });

    const games = [
      ...Array.from({ length: 4 }, () => gameTemplate(true)),
      ...Array.from({ length: 4 }, () => gameTemplate(false)),
    ];

    const raw = computeRawRunStoppageRate(games);
    assert.equal(raw.opponent_scoring_runs, 8);
    assert.equal(raw.run_interruptions, 4);
    assert.equal(raw.run_stoppage_rate, 0.5);
  });

  it("normalizes scores around league baseline", () => {
    assert.equal(normalizeMomentumKillerScore(0.5, 0.5), 50);
    assert.ok(normalizeMomentumKillerScore(0.62, 0.5) > 60);
    assert.ok(normalizeMomentumKillerScore(0.38, 0.5) < 40);
  });

  it("assigns qualitative labels from score bands", () => {
    assert.equal(momentumKillerLabelFromScore(80), "high-run-interrupter");
    assert.equal(momentumKillerLabelFromScore(50), "neutral-flow");
    assert.equal(momentumKillerLabelFromScore(15), "high-flow-enabler");
  });

  it("finalizes league-relative scores for officials", () => {
    const finalized = finalizeMomentumKillerScores([
      { slug: "a", rawRate: 0.55, backedGames: 20, runs: 10, interruptions: 5 },
      { slug: "b", rawRate: 0.35, backedGames: 20, runs: 10, interruptions: 4 },
      { slug: "c", rawRate: 0.45, backedGames: 20, runs: 10, interruptions: 4 },
    ]);

    assert.equal(leagueRunStoppageBaseline([0.35, 0.45, 0.55]), 0.45);
    assert.ok((finalized.get("a")?.momentum_killer_score ?? 0) > 50);
    assert.ok((finalized.get("b")?.momentum_killer_score ?? 0) < 50);
  });

  it("returns insufficient data for non-basketball leagues", () => {
    const result = computeMomentumKillerIndex("nfl", []);
    assert.equal(result.data_quality, "insufficient");
    assert.equal(result.momentum_killer_score, null);
  });

  it("summarizes a single game timeline", () => {
    const summary = summarizeMomentumRuns({
      homeTeam: "LAL",
      awayTeam: "BOS",
      scoringPlays: [
        { team: "LAL", points: 2, gameSecondsElapsed: 100 },
        { team: "LAL", points: 3, gameSecondsElapsed: 120 },
        { team: "LAL", points: 3, gameSecondsElapsed: 140 },
      ],
    });

    assert.equal(summary.scoringRunBacked, true);
    assert.equal(summary.opponentScoringRuns, 1);
  });
});
