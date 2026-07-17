import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ABOUT_PILLARS, ABOUT_PAGE_LEAD } from "@/lib/about-content";
import { HOMEPAGE_METHODOLOGY_BLURB } from "@/lib/homepage-insight-gates";
import { loadValidationReport } from "@/lib/validation-report";
import { REFWATCH_AUDIENCE } from "@/lib/trust-charter";

const EM_DASH = "\u2014";

function readSrc(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("strategic pivot surfaces", () => {
  it("about page articulates research-first positioning", () => {
    assert.match(ABOUT_PAGE_LEAD, /research/i);
    assert.match(ABOUT_PAGE_LEAD, /sample gates/i);
    assert.equal(ABOUT_PILLARS.length, 4);
    assert.match(REFWATCH_AUDIENCE, /research/i);
    assert.match(REFWATCH_AUDIENCE, /not unvalidated trader alpha/i);
  });

  it("homepage hero links methodology and validation", () => {
    const hero = readSrc("src/components/OverviewHero.tsx");
    assert.match(hero, /HOMEPAGE_METHODOLOGY_BLURB/);
    assert.match(hero, /href="\/methodology"/);
    assert.match(hero, /href="\/research\/validation"/);
    assert.match(hero, /TrustCharterSummary/);
  });

  it("insight cards render honesty footnotes when adjusted", () => {
    const card = readSrc("src/components/shared/InsightCard.tsx");
    assert.match(card, /InsightHonestyFootnote/);
    assert.match(card, /STANDOUT_SPLIT_FOOTNOTE/);
  });

  it("validation report loads committed backtest JSON", () => {
    const report = loadValidationReport();
    assert.ok(report.generatedAt);
    assert.ok(report.nbaWhistlePremium.signal.includes("Whistle Premium"));
    assert.equal(typeof report.hasExternalLineCoverage, "boolean");
  });

  it("user-facing pivot copy avoids em dashes", () => {
    const files = [
      "src/components/OverviewHero.tsx",
      "src/lib/about-content.ts",
      "src/components/ValidationReportContent.tsx",
      "src/lib/gsni-home-findings.ts",
    ];
    for (const file of files) {
      assert.doesNotMatch(readSrc(file), new RegExp(EM_DASH), file);
    }
  });

  it("exports homepage methodology blurb for editorial sections", () => {
    assert.match(HOMEPAGE_METHODOLOGY_BLURB, /15\+ games/i);
  });
});
