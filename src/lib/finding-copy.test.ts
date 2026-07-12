import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFindingSampleMeta,
  formatSeasonSpan,
  isNeutralRate,
  overUnderFrequencyHeadline,
  whistleParadoxHeadline,
  whistlePaceHeadline,
} from "@/lib/finding-copy";

describe("finding-copy", () => {
  it("detects neutral over rates between 49% and 51%", () => {
    assert.equal(isNeutralRate(0.49), true);
    assert.equal(isNeutralRate(0.5), true);
    assert.equal(isNeutralRate(0.51), true);
    assert.equal(isNeutralRate(0.48), false);
    assert.equal(isNeutralRate(0.52), false);
  });

  it("formats compressed season spans", () => {
    assert.equal(
      formatSeasonSpan(["2016-17", "2017-18", "2025-26"]),
      "2016–2026",
    );
    assert.equal(
      formatFindingSampleMeta(11979, ["2016-17", "2017-18", "2025-26"]),
      "Sample: 11,979 games over 3 seasons (2016–2026)",
    );
  });

  it("uses balanced language for neutral over/under headlines", () => {
    const headline = overUnderFrequencyHeadline("Mitchell Ervin", 0.5, "low");
    assert.match(headline, /benchmark|neutral|standard pacing/i);
    assert.doesNotMatch(headline, /under frequency|over frequency|heavy/i);
  });

  it("notes whistle/scoring divergence when pace is high but outcome is neutral", () => {
    const headline = whistlePaceHeadline("Mitchell Ervin", 1.2, "fouls", 0.5);
    assert.match(headline, /high foul pace/i);
    assert.match(headline, /dead-neutral/i);
  });

  it("keeps paradox language when scoring is clearly under neutral", () => {
    const headline = whistleParadoxHeadline("Scott Foster", 0.44);
    assert.match(headline, /scores stay low/i);
  });
});
