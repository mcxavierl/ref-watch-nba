import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANOMALY_VARIANCE_THRESHOLD,
  qualifiesAnomalyScore,
  qualifiesRefAnomaly,
  refInterestingnessScore,
  sortByAbsDeviation,
  sortRefsByInterestingness,
} from "@/lib/anomaly-surface";
import type { RefProfile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test",
    name: "Test Ref",
    number: 1,
    games: 100,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    ...overrides,
  };
}

describe("anomaly-surface", () => {
  it("uses 1.0 as the default variance gate", () => {
    assert.equal(ANOMALY_VARIANCE_THRESHOLD, 1.0);
    assert.equal(qualifiesAnomalyScore(1.2), true);
    assert.equal(qualifiesAnomalyScore(1.0), false);
    assert.equal(qualifiesAnomalyScore(-1.4), true);
  });

  it("sorts by absolute deviation", () => {
    const sorted = sortByAbsDeviation(
      [{ id: "a", score: 0.2 }, { id: "b", score: -1.8 }, { id: "c", score: 1.1 }],
      (row) => row.score,
    );
    assert.deepEqual(sorted.map((row) => row.id), ["b", "c", "a"]);
  });

  it("ranks refs by interestingness and anomaly gate", () => {
    const quiet = makeRef({ slug: "quiet", name: "Quiet", totalPointsDelta: 0.2, foulsDelta: 0.1 });
    const warm = makeRef({ slug: "warm", name: "Warm", totalPointsDelta: 1.2, foulsDelta: 0.4 });
    const hot = makeRef({ slug: "hot", name: "Hot", totalPointsDelta: 4.2, foulsDelta: 0.5 });
    const sorted = sortRefsByInterestingness([quiet, hot, warm], "nba");
    assert.equal(sorted[0]?.slug, "hot");
    assert.equal(qualifiesRefAnomaly(hot, "nba", 0), true);
    assert.equal(qualifiesRefAnomaly(warm, "nba", 0), false);
    assert.equal(qualifiesRefAnomaly(quiet, "nba", 0), false);
    assert.equal(qualifiesRefAnomaly(warm, "nba", 2), true);
    assert.ok(refInterestingnessScore(hot, "nba") > refInterestingnessScore(quiet, "nba"));
  });
});
