import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BANNED_NEGATIVE_DELTA_HEADLINE } from "@/lib/finding-copy";
import {
  computeWorldCupFinalFindings,
  getWorldCupFinalCatalog,
  resolveWorldCupFinal,
} from "@/lib/worldcup/final-2026";

describe("worldcup final-2026", () => {
  it("loads curated final catalog", () => {
    const catalog = getWorldCupFinalCatalog();
    assert.equal(catalog.match.stage, "Final");
    assert.equal(catalog.match.awayTeam.code, "ARG");
    assert.equal(catalog.match.homeTeam.code, "ESP");
    assert.equal(catalog.officials.referee.name, "Slavko Vinčić");
  });

  it("resolves kickoff labels and upcoming state", () => {
    const final = resolveWorldCupFinal();
    assert.ok(final);
    assert.match(final!.kickoffLabel, /July 19/i);
    assert.match(final!.kickoffLabel, /3:00 PM ET/);
  });

  it("emits findings with referee and analytics", () => {
    const findings = computeWorldCupFinalFindings(6);
    assert.ok(findings.length >= 4);
    for (const finding of findings) {
      assert.ok(finding.explainer && finding.explainer.length > 20);
      assert.ok(!BANNED_NEGATIVE_DELTA_HEADLINE.test(finding.headline));
    }
    const referee = findings.find((f) => f.id === "wc-final-referee");
    assert.ok(referee);
    assert.match(referee!.headline, /Vinčić/i);
    assert.ok(referee!.stats.some((s) => s.label === "Referee"));
  });
});
