import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  highlightCardAccentForInsight,
  highlightCardIconForInsight,
  rankingsInsightCardTone,
} from "@/lib/highlight-card-visuals";

describe("highlight-card-visuals", () => {
  it("treats leaderboard rate cards as positive tone", () => {
    assert.equal(
      rankingsInsightCardTone({
        id: "top-ats",
        title: "Strongest home ATS track record",
        body: "sample",
        statValue: "62.8%",
      }),
      "positive",
    );
  });

  it("maps insight ids to accent keys", () => {
    assert.equal(highlightCardAccentForInsight("top-scoring"), "scoring");
    assert.equal(highlightCardAccentForInsight("top-over"), "over");
    assert.equal(highlightCardAccentForInsight("top-ou-betting"), "ou");
    assert.ok(highlightCardIconForInsight("top-ats"));
  });
});
