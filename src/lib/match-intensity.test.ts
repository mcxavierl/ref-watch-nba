import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getIntensityLabel,
  HIGH_INTENSITY_FOUL_FLOOR,
  INTENSITY_LEAGUE_DELTA_THRESHOLD,
  intensityLabelSlug,
} from "@/lib/match-intensity";

describe("match intensity", () => {
  const leagueAvg = 42;

  it("flags games above the absolute foul floor as high intensity", () => {
    assert.equal(
      getIntensityLabel(HIGH_INTENSITY_FOUL_FLOOR + 1),
      "High Intensity",
    );
    assert.equal(getIntensityLabel(50, leagueAvg), "High Intensity");
  });

  it("flags games above league avg + threshold as high intensity", () => {
    assert.equal(
      getIntensityLabel(leagueAvg + INTENSITY_LEAGUE_DELTA_THRESHOLD + 1, leagueAvg),
      "High Intensity",
    );
  });

  it("flags games below league avg - threshold as low intensity", () => {
    assert.equal(
      getIntensityLabel(leagueAvg - INTENSITY_LEAGUE_DELTA_THRESHOLD - 1, leagueAvg),
      "Low Intensity",
    );
  });

  it("treats near-league-average games as standard", () => {
    assert.equal(getIntensityLabel(leagueAvg, leagueAvg), "Standard");
    assert.equal(
      getIntensityLabel(leagueAvg + INTENSITY_LEAGUE_DELTA_THRESHOLD, leagueAvg),
      "Standard",
    );
    assert.equal(
      getIntensityLabel(leagueAvg - INTENSITY_LEAGUE_DELTA_THRESHOLD, leagueAvg),
      "Standard",
    );
  });

  it("defaults to standard when league average is unavailable", () => {
    assert.equal(getIntensityLabel(25), "Standard");
    assert.equal(getIntensityLabel(28, undefined), "Standard");
  });

  it("maps labels to slugs for styling", () => {
    assert.equal(intensityLabelSlug("High Intensity"), "high");
    assert.equal(intensityLabelSlug("Low Intensity"), "low");
    assert.equal(intensityLabelSlug("Standard"), "standard");
  });
});
