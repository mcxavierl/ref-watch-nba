import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGsni,
  gsniBand,
  gsniCaption,
  gsniFromRefProfile,
  isExtremeGsni,
} from "@/lib/gsni-display";

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

  it("reads GSNI from ref profiles when present", () => {
    assert.equal(
      gsniFromRefProfile({
        slug: "test",
        name: "Test",
        number: 1,
        games: 100,
        avgTotalPoints: 45,
        overRate: 0.5,
        avgFouls: 12,
        referee_gsni: 71.2,
      }),
      71.2,
    );
    assert.equal(
      gsniFromRefProfile({
        slug: "test",
        name: "Test",
        number: 1,
        games: 100,
        avgTotalPoints: 45,
        overRate: 0.5,
        avgFouls: 12,
      }),
      null,
    );
  });
});
