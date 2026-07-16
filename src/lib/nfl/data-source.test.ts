import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNflSimulatedData,
  isNflVerifiedData,
  nflPreviewBannerMessage,
} from "./data-source";

describe("NFL data source honesty", () => {
  it("treats espn as verified", () => {
    assert.equal(isNflVerifiedData("espn"), true);
    assert.equal(isNflSimulatedData("espn"), false);
  });

  it("treats seeded and historical as simulated", () => {
    assert.equal(isNflSimulatedData("seeded"), true);
    assert.equal(isNflSimulatedData("historical"), true);
  });

  it("treats hybrid as verified", () => {
    assert.equal(isNflVerifiedData("hybrid"), true);
    assert.equal(isNflSimulatedData("hybrid"), false);
  });

  it("preview banner warns on simulated data", () => {
    const msg = nflPreviewBannerMessage("seeded", "seeded");
    assert.match(msg, /Preview dataset/i);
    assert.match(msg, /simulated/i);
  });

  it("preview banner notes missing lines for espn stats", () => {
    const msg = nflPreviewBannerMessage("espn", "espn");
    assert.match(msg, /ATS\/O-U/i);
  });

  it("preview banner notes verified hybrid stats", () => {
    const msg = nflPreviewBannerMessage("hybrid", "espn", true);
    assert.match(msg, /ESPN game data/i);
  });
});
