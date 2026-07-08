import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  directoryScoringDisplay,
  formatPctVsLeague,
  scoringVsLeaguePct,
} from "./scoring-metrics";

describe("scoringVsLeaguePct", () => {
  it("amplifies NHL-scale deltas into readable percentages", () => {
    assert.equal(scoringVsLeaguePct(7.3, 7.2).toFixed(1), "1.4");
    assert.equal(scoringVsLeaguePct(7.1, 7.2).toFixed(1), "-1.4");
  });

  it("formats near-zero as 0.0%", () => {
    assert.equal(formatPctVsLeague(0.02), "0.0%");
    assert.equal(formatPctVsLeague(1.4), "+1.4%");
  });

  it("directory display uses pct for low-scoring leagues", () => {
    const display = directoryScoringDisplay(
      { avgTotalPoints: 7.3, totalPointsDelta: 0.1 },
      7.2,
    );
    assert.equal(display.usePct, true);
    assert.equal(display.formatted, "+1.4%");
  });
});
