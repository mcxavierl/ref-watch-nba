import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRefGamesMeta,
  formatRefJerseyNumber,
  formatRefNameWithNumber,
  hasRefJerseyNumber,
} from "./ref-number";

describe("ref-number", () => {
  it("hides placeholder zero jersey numbers", () => {
    assert.equal(hasRefJerseyNumber(0), false);
    assert.equal(formatRefJerseyNumber(0), null);
    assert.equal(formatRefNameWithNumber("Anthony Taylor", 0), "Anthony Taylor");
    assert.equal(formatRefGamesMeta(0, 89, "matches"), "89 matches");
  });

  it("formats real jersey numbers", () => {
    assert.equal(hasRefJerseyNumber(48), true);
    assert.equal(formatRefJerseyNumber(48), "#48");
    assert.equal(
      formatRefNameWithNumber("Scott Foster", 48),
      "Scott Foster (#48)",
    );
    assert.equal(formatRefGamesMeta(48, 120, "games"), "#48 · 120 games");
  });
});
