import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGsni,
  gsniBand,
  gsniCaption,
  gsniFromRefProfile,
  gsniObservedFromRefProfile,
  gsniShrinkageFromProfile,
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
  it("maps index bands and captions", () => {
    assert.equal(gsniBand(82), "quiet");
    assert.equal(gsniBand(18), "heavy");
    assert.equal(gsniBand(50), "neutral");
    assert.equal(gsniCaption(82), "Quieter in key states");
    assert.equal(gsniCaption(18), "Heavier in key states");
    assert.equal(formatGsni(63.7), "64");
    assert.equal(isExtremeGsni(80), true);
    assert.equal(isExtremeGsni(55), false);
  });

  it("reads shrunk GSNI from ref profiles when present", () => {
    const profile = makeRef({ referee_gsni: 82, gsniHighLeverageMinutes: 20 });
    const shrinkage = gsniShrinkageFromProfile(profile);
    assert.ok(shrinkage);
    assert.equal(shrinkage!.observed, 82);
    assert.ok(shrinkage!.display < shrinkage!.observed);
    assert.equal(gsniFromRefProfile(profile), shrinkage!.display);
    assert.equal(gsniObservedFromRefProfile(profile), 82);
  });

  it("returns null when GSNI is missing", () => {
    assert.equal(gsniFromRefProfile(makeRef()), null);
    assert.equal(gsniShrinkageFromProfile(makeRef()), null);
  });
});
