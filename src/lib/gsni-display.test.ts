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
  it("maps Z-score bands and captions", () => {
    assert.equal(gsniBand(1.2), "quiet");
    assert.equal(gsniBand(-1.2), "heavy");
    assert.equal(gsniBand(0.2), "neutral");
    assert.equal(gsniBandTitle("quiet"), "Quiet");
    assert.equal(gsniCaption(1.2), "Quiet in clutch states");
    assert.equal(gsniCaption(-1.2), "Heavy in clutch states");
    assert.equal(gsniShortLabel(0.2), "Neutral");
    assert.equal(formatGsni(1.23), "+1.2σ");
    assert.equal(isExtremeGsni(1.8), true);
    assert.equal(isExtremeGsni(0.8), false);
  });

  it("maps qualitative labels by |Z| thresholds", () => {
    assert.equal(gsniQualitativeLabel(0.2), "Neutral");
    assert.equal(gsniQualitativeLabel(0.9), "Quiet");
    assert.equal(gsniQualitativeLabel(-0.9), "Heavy");
    assert.equal(gsniQualitativeLabel(1.8), "Extreme Quiet");
    assert.equal(gsniQualitativeLabel(-1.8), "Extreme Heavy");
  });

  it("explains how quiet and heavy labels are derived", () => {
    const quiet = explainGsni(1.2);
    assert.equal(quiet.band, "quiet");
    assert.equal(quiet.tendency, "quieter");
    assert.match(quiet.comparisonLine, /quieter than average/i);
    assert.match(quiet.methodLine, /score gap and clock/i);
    assert.match(quiet.scaleLine, /standard deviations/i);

    const heavy = explainGsni(-1.2);
    assert.equal(heavy.band, "heavy");
    assert.equal(heavy.tendency, "heavier");
  });

  it("reads shrunk GSNI from ref profiles when present", () => {
    const profile = makeRef({ referee_gsni: 1.2, gsniHighLeverageMinutes: 20 });
    const shrinkage = gsniShrinkageFromProfile(profile);
    assert.ok(shrinkage);
    assert.equal(shrinkage!.observed, 1.2);
    assert.ok(shrinkage!.display < shrinkage!.observed);
    assert.equal(gsniFromRefProfile(profile), shrinkage!.display);
    assert.equal(gsniObservedFromRefProfile(profile), 1.2);
  });

  it("returns null when GSNI is missing", () => {
    assert.equal(gsniFromRefProfile(makeRef()), null);
    assert.equal(gsniShrinkageFromProfile(makeRef()), null);
  });
});
