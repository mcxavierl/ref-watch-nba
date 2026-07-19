import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  atsInsightLabel,
  atsOutlierHeadline,
  homeAtsSignalHeadline,
  scoringPaceInsight,
  whistleInflationHeadline,
} from "@/lib/insight-headlines";

describe("insight-headlines", () => {
  it("maps ATS splits to behavioral labels", () => {
    assert.equal(atsInsightLabel(0.42), "Strong ATS Fade");
    assert.equal(atsInsightLabel(0.58), "ATS Cover Lean");
    assert.equal(atsInsightLabel(0.5), "Neutral ATS");
    assert.match(
      atsOutlierHeadline("Scott Foster", 0.41, "41.0%"),
      /Strong ATS Fade/,
    );
  });

  it("maps scoring and whistle deltas to insight headlines", () => {
    assert.equal(scoringPaceInsight(2.1), "Pace Inflation");
    assert.equal(whistleInflationHeadline(2.5, "fouls"), "Whistle Inflation");
    assert.equal(homeAtsSignalHeadline(-0.08), "Strong ATS Fade");
  });
});
