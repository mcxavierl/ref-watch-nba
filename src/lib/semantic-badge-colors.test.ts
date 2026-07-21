import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  insightToneToSemanticRole,
  semanticBadgeSurfaceClass,
  semanticBadgeTextClass,
} from "@/lib/semantic-badge-colors";

describe("semantic-badge-colors", () => {
  it("maps roles to emerald, amber, slate, and purple utilities", () => {
    assert.match(semanticBadgeTextClass("confidence"), /emerald/);
    assert.match(semanticBadgeTextClass("anomaly"), /amber/);
    assert.match(semanticBadgeTextClass("baseline"), /slate/);
    assert.match(semanticBadgeTextClass("research"), /purple/);
    assert.match(semanticBadgeSurfaceClass("confidence"), /emerald/);
    assert.match(semanticBadgeSurfaceClass("anomaly"), /amber/);
  });

  it("maps insight tones to semantic roles", () => {
    assert.equal(insightToneToSemanticRole("positive"), "confidence");
    assert.equal(insightToneToSemanticRole("negative"), "anomaly");
    assert.equal(insightToneToSemanticRole("neutral"), "baseline");
  });
});
