import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPressureContext,
  classifyPressureTendency,
  computePressureIndex,
  PRESSURE_INDEX_BASELINE,
} from "@/lib/analytics/pressure-index";

describe("pressure-index", () => {
  it("flags playoff, national TV, and late close-game contexts", () => {
    const playoff = classifyPressureContext(
      { homeScore: 102, awayScore: 98, isPlayoff: true },
      "nba",
    );
    assert.equal(playoff.pressureFlag, true);
    assert.ok(playoff.reasons.includes("playoff"));

    const nationalTv = classifyPressureContext(
      {
        homeScore: 108,
        awayScore: 104,
        date: "2025-12-25",
        season: "2025-26",
      },
      "nba",
    );
    assert.equal(nationalTv.pressureFlag, true);
    assert.ok(nationalTv.reasons.includes("national-tv"));

    const lateClose = classifyPressureContext(
      {
        homeScore: 101,
        awayScore: 98,
        whistlePeriodSplits: {
          unit: "quarter",
          source: "boxscore",
          buckets: [
            { period: 1, home: 5, away: 5 },
            { period: 2, home: 5, away: 5 },
            { period: 3, home: 5, away: 5 },
            { period: 4, home: 8, away: 7 },
          ],
        },
      },
      "nba",
    );
    assert.equal(lateClose.pressureFlag, true);
    assert.ok(lateClose.reasons.includes("late-close-game"));
  });

  it("computes pressure index above 100 when whistle rate rises under pressure", () => {
    const games = [
      ...Array.from({ length: 5 }, () => ({
        homeScore: 110,
        awayScore: 95,
        whistleTotal: 40,
      })),
      ...Array.from({ length: 4 }, () => ({
        homeScore: 102,
        awayScore: 100,
        isPlayoff: true,
        whistleTotal: 52,
      })),
    ];

    const result = computePressureIndex("nba", games);
    assert.ok(result.pressure_index !== null);
    assert.ok((result.pressure_index ?? 0) > PRESSURE_INDEX_BASELINE);
    assert.equal(result.pressure_tendency_label, "tightens-under-pressure");
  });

  it("computes pressure index below 100 when whistle rate drops under pressure", () => {
    const games = [
      ...Array.from({ length: 5 }, () => ({
        homeScore: 110,
        awayScore: 95,
        whistleTotal: 48,
      })),
      ...Array.from({ length: 4 }, () => ({
        homeScore: 101,
        awayScore: 99,
        isPrimetime: true,
        whistleTotal: 36,
      })),
    ];

    const result = computePressureIndex("nba", games);
    assert.ok(result.pressure_index !== null);
    assert.ok((result.pressure_index ?? 0) < PRESSURE_INDEX_BASELINE);
    assert.equal(result.pressure_tendency_label, "swallows-whistle-under-pressure");
  });

  it("returns insufficient sample when pressure or baseline games are sparse", () => {
    const result = computePressureIndex("nba", [
      { homeScore: 100, awayScore: 98, whistleTotal: 40 },
      { homeScore: 101, awayScore: 99, isPlayoff: true, whistleTotal: 44 },
    ]);
    assert.equal(result.pressure_index, null);
    assert.equal(result.pressure_tendency_label, "insufficient-sample");
    assert.equal(classifyPressureTendency(null, 1, 1), "insufficient-sample");
  });
});
