import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("design audit guardrails", () => {
  it("loads semantic a11y utilities and clinical doc tokens globally", () => {
    const globals = readSrc("src/app/globals.css");
    assert.match(globals, /a11y-utilities\.css/);
    assert.match(globals, /clinical-doc-tokens\.css/);
    assert.match(globals, /--page-max: 72rem/);
  });

  it("avoids raw slate text utilities on homepage hero and about page", () => {
    const hero = readSrc("src/components/OverviewHero.tsx");
    const about = readSrc("src/app/about/page.tsx");
    assert.doesNotMatch(hero, /text-slate-/);
    assert.doesNotMatch(about, /text-slate-/);
    assert.doesNotMatch(about, /\bmt-\d+/);
    assert.match(about, /clinical-doc-section/);
  });

  it("uses theme-aware tokens on validation and CCI surfaces", () => {
    const validation = readSrc("src/components/validation-report.css");
    const clinical = readSrc("src/styles/clinical-doc-tokens.css");
    assert.match(validation, /var\(--methodology-ink\)/);
    assert.match(validation, /var\(--space-/);
    assert.match(clinical, /var\(--text-primary\)/);
    assert.match(readSrc("src/components/overview-clinical-modern.css"), /var\(--clinical-ink\)/);
  });

  it("research banner uses semantic CSS instead of slate tailwind", () => {
    const banner = readSrc("src/components/ResearchHighlightBanner.tsx");
    assert.match(banner, /research-highlight-banner/);
    assert.doesNotMatch(banner, /slate-/);
  });

  it("insight honesty footnotes use data-honesty-footnote class", () => {
    const card = readSrc("src/components/shared/InsightCard.tsx");
    assert.match(card, /data-honesty-footnote/);
    assert.doesNotMatch(card, /text-slate-500/);
  });
});
