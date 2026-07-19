import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  explainGsni,
  formatGsni,
  gsniBand,
  gsniBandTitle,
  gsniCaption,
  gsniFromRefProfile,
  gsniObservedFromRefProfile,
  gsniQualitativeLabel,
  gsniShrinkageFromProfile,
  gsniShortLabel,
  isExtremeGsni,
} from "@/lib/gsni-display";
import type { RefProfile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test",
    name: "Test",
    number: 1,
    games: 100,
    avgTotalPoints: 45,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    ...overrides,
  };
}

describe("gsni display", () => {
  it("maps index score bands and captions", () => {
    assert.equal(gsniBand(1.2), "quiet");
    assert.equal(gsniBand(-1.2), "heavy");
    assert.equal(gsniBand(0.2), "neutral");
    assert.equal(gsniBandTitle("quiet"), "Below-Average Frequency");
    assert.match(gsniCaption(1.2), /lower-than-average penalty frequency/i);
    assert.match(gsniCaption(-1.2), /higher-than-average penalty frequency/i);
    assert.equal(gsniShortLabel(0.2), "Typical Frequency");
    assert.equal(formatGsni(1.23), "Index Score: +1.2");
    assert.equal(isExtremeGsni(1.8), true);
    assert.equal(isExtremeGsni(0.8), false);
  });

  it("maps qualitative labels by index score thresholds", () => {
    assert.equal(gsniQualitativeLabel(0.2), "Typical Frequency");
    assert.equal(gsniQualitativeLabel(0.9), "Below-Average Frequency");
    assert.equal(gsniQualitativeLabel(-0.9), "Above-Average Frequency");
    assert.equal(gsniQualitativeLabel(1.8), "Well Below-Average Frequency");
    assert.equal(gsniQualitativeLabel(-1.8), "Well Above-Average Frequency");
  });

  it("explains frequency labels in plain language", () => {
    const quiet = explainGsni(1.2);
    assert.equal(quiet.band, "quiet");
    assert.equal(quiet.tendency, "below-average");
    assert.match(quiet.comparisonLine, /lower-than-average penalty frequency/i);
    assert.match(quiet.methodLine, /score gap and clock/i);
    assert.match(quiet.scaleLine, /Index Score/i);

    const heavy = explainGsni(-1.2);
    assert.equal(heavy.band, "heavy");
    assert.equal(heavy.tendency, "above-average");
  });

  it("reads shrunk Game-State Index from ref profiles when present", () => {
    const profile = makeRef({ referee_gsni: 1.2, gsniHighLeverageMinutes: 20 });
    const shrinkage = gsniShrinkageFromProfile(profile);
    assert.ok(shrinkage);
    assert.equal(shrinkage!.observed, 1.2);
    assert.ok(shrinkage!.display < shrinkage!.observed);
    assert.equal(gsniFromRefProfile(profile), shrinkage!.display);
    assert.equal(gsniObservedFromRefProfile(profile), 1.2);
    assert.match(shrinkage!.tooltip, /Index Score/i);
  });

  it("returns null when Game-State Index is missing", () => {
    assert.equal(gsniFromRefProfile(makeRef()), null);
    assert.equal(gsniShrinkageFromProfile(makeRef()), null);
  });
});
