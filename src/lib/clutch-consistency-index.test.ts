import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clutchSituationHeadline,
  confidenceTagForMinutes,
  consistencyProfileFromIndex,
  highLeverageMinutesLine,
} from "@/lib/clutch-consistency-index";

describe("clutch consistency index copy", () => {
  it("maps high scores to consistency and low scores to variance", () => {
    assert.equal(consistencyProfileFromIndex(100), "high-consistency");
    assert.equal(consistencyProfileFromIndex(0), "high-variance");
    assert.equal(
      clutchSituationHeadline("Barry Anderson", 100),
      "Barry Anderson shows high consistency in clutch situations.",
    );
    assert.equal(
      clutchSituationHeadline("Tony Corrente", 0),
      "Tony Corrente shows high behavioral variance in clutch situations.",
    );
  });

  it("surfaces high-leverage minute transparency", () => {
    assert.equal(highLeverageMinutesLine(46.2), "Based on N=46 high-leverage minutes.");
    assert.equal(confidenceTagForMinutes(49), "Preliminary");
    assert.equal(confidenceTagForMinutes(50), null);
  });
});
