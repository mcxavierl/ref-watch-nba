import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gsniConfidenceLabel } from "@/lib/ref-gsni";

describe("gsniConfidenceLabel", () => {
  it("maps high-leverage minutes to confidence tiers", () => {
    assert.equal(gsniConfidenceLabel(12), "Low");
    assert.equal(gsniConfidenceLabel(50), "Med");
    assert.equal(gsniConfidenceLabel(99), "Med");
    assert.equal(gsniConfidenceLabel(100), "High");
  });
});
