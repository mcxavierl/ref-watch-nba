import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  semanticImpactTextClass,
  semanticImpactTone,
  semanticWinRateTone,
} from "@/lib/semantic-impact";

describe("semantic-impact", () => {
  it("returns neutral for deltas inside the band", () => {
    assert.equal(semanticImpactTone(0.4), "neutral");
    assert.equal(semanticImpactTone(-0.2), "neutral");
    assert.equal(semanticImpactTone(0), "neutral");
  });

  it("colors meaningful positive and negative deltas", () => {
    assert.equal(semanticImpactTone(2.5), "positive");
    assert.equal(semanticImpactTone(-1.2), "negative");
    assert.match(semanticImpactTextClass(2.5), /emerald/);
    assert.match(semanticImpactTextClass(-1.2), /rose/);
  });

  it("forces neutral when sample is below gate", () => {
    assert.equal(
      semanticImpactTone(5, { sampleGames: 6, minSampleGames: 10 }),
      "neutral",
    );
  });

  it("colors win rates relative to baseline", () => {
    assert.equal(semanticWinRateTone(58, 50), "positive");
    assert.equal(semanticWinRateTone(42, 50), "negative");
    assert.equal(semanticWinRateTone(51, 50), "neutral");
  });
});
