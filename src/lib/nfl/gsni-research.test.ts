import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGsniResearchHighlights,
  buildGsniResearchRows,
} from "@/lib/nfl/gsni-research";
import { getRefStats } from "@/lib/nfl/data";

describe("NFL GSNI research", () => {
  it("builds highlight cards for extreme state-quiet and state-heavy officials", () => {
    const stats = getRefStats();
    const highlights = buildGsniResearchHighlights(stats);
    assert.ok(highlights.length > 0, "expected GSNI highlight cards");
    for (const card of highlights) {
      assert.ok(card.gsni !== null);
      assert.ok(card.band === "quiet" || card.band === "heavy");
      assert.match(card.headline, /GSNI \d+/);
    }
  });

  it("lists officials with tracked high-leverage GSNI samples", () => {
    const stats = getRefStats();
    const rows = buildGsniResearchRows(stats);
    assert.ok(rows.length > 10, `expected GSNI rows, got ${rows.length}`);
    const cleared = rows.filter((row) => row.gateCleared);
    assert.ok(cleared.length > 0, "expected gate-cleared GSNI rows");
    for (const row of cleared) {
      assert.ok(row.gsni !== null);
      assert.ok(row.highLeverageMinutes >= 25);
    }
  });
});
