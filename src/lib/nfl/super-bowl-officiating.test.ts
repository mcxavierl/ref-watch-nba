import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BANNED_NEGATIVE_DELTA_HEADLINE } from "@/lib/finding-copy";
import {
  computeSuperBowlFindings,
  getSuperBowlCatalog,
  resolveSuperBowlGames,
} from "@/lib/nfl/super-bowl-officiating";

describe("super-bowl-officiating", () => {
  it("loads curated catalog with 27 games (SB XXXIV–LX)", () => {
    const catalog = getSuperBowlCatalog();
    assert.equal(catalog.games.length, 27);
    assert.ok(catalog.games[0]!.number >= 34);
    assert.equal(catalog.games.at(-1)!.number, 60);
  });

  it("resolves referee slugs for active NFL officials", () => {
    const games = resolveSuperBowlGames();
    const blakeman = games.find((g) => g.referee === "Clete Blakeman");
    const smith = games.find((g) => g.referee === "Shawn Smith");
    assert.ok(blakeman?.refereeSlug);
    assert.ok(smith?.refereeSlug);
  });

  it("emits findings with explainers and honest scoring copy", () => {
    const findings = computeSuperBowlFindings(6);
    assert.ok(findings.length >= 4);
    for (const finding of findings) {
      assert.ok(finding.explainer && finding.explainer.length > 20);
      assert.ok(finding.sampleNote.includes("Super Bowl"));
      assert.ok(!BANNED_NEGATIVE_DELTA_HEADLINE.test(finding.headline));
    }
    const lowest = findings.find((f) => f.id === "nfl-sb-lowest-scoring");
    assert.ok(lowest);
    assert.match(lowest!.headline, /under|below|fewer|near/i);
  });

  it("includes penalty extremes when data is present", () => {
    const findings = computeSuperBowlFindings(8);
    const most = findings.find((f) => f.id === "nfl-sb-most-penalties");
    assert.ok(most);
    assert.match(most!.headline, /penalt|flag/i);
    assert.ok(most!.stats.some((s) => s.label === "Total penalties"));
  });
});
