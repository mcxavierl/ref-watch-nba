import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanInternationalMatchupOutliers } from "@/lib/insights/international-matchups";
import { isClinicalTone } from "@/lib/insights/tone-filter";
import { candidateToInsightCard } from "@/lib/insights/generator-core";

describe("international matchup insights", () => {
  it("scans soccer leagues for origin edges without throwing", () => {
    const candidates = scanInternationalMatchupOutliers();
    assert.ok(Array.isArray(candidates));
    for (const candidate of candidates) {
      assert.equal(candidate.kind, "international-origin");
      assert.ok(candidate.refSlug);
      assert.ok(candidate.internationalHighlight);
    }
  });

  it("maps international candidates to insight cards with clinical tone", () => {
    const candidates = scanInternationalMatchupOutliers();
    if (candidates.length === 0) return;

    const card = candidateToInsightCard(candidates[0]!);
    assert.equal(card.kind, "league-pattern");
    assert.ok(isClinicalTone(card.headline));
    assert.ok(isClinicalTone(card.story));
    assert.match(card.kicker, /origin/i);
  });
});
