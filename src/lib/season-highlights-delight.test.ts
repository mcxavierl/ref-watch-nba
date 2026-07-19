import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hasSignedMetricDetail, splitSignedMetricDetail } from "@/lib/finding-metric-display";

describe("finding-metric-display", () => {
  it("splits signed delta prefix from league comparison suffix", () => {
    assert.deepEqual(splitSignedMetricDetail("-1.2 vs 7.3 league avg"), {
      delta: "-1.2",
      suffix: "vs 7.3 league avg",
    });
    assert.deepEqual(splitSignedMetricDetail("+4.5pp vs baseline"), {
      delta: "+4.5pp",
      suffix: "vs baseline",
    });
  });

  it("returns null when detail has no signed delta prefix", () => {
    assert.equal(splitSignedMetricDetail("vs 25.2 league avg"), null);
    assert.equal(hasSignedMetricDetail("12+ games each"), false);
  });
});

describe("Season highlights visual delight", () => {
  it("imports season-highlights-delight stylesheet", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    assert.match(globals, /season-highlights-delight\.css/);
  });

  it("styles whistle-extreme and ref-outlier category pills with semantic purple/indigo", () => {
    const css = readFileSync("src/styles/season-highlights-delight.css", "utf8");
    assert.match(css, /whistle-extreme/);
    assert.match(css, /ref-outlier/);
    assert.match(css, /#8b5cf6|finding-category-whistle/);
    assert.match(css, /#6366f1|finding-category-outlier/);
  });

  it("FindingMetricsGrid renders directional delta arrows in detail rows", () => {
    const source = readFileSync("src/components/FindingCardLayout.tsx", "utf8");
    assert.match(source, /DirectionalDeltaValue/);
    assert.match(source, /FindingMetricDetail/);
  });

  it("Season highlights slate marks the first feed card as hero", () => {
    const section = readFileSync("src/components/FindingsSection.tsx", "utf8");
    const feed = readFileSync("src/components/FindingsFeedList.tsx", "utf8");
    const accordion = readFileSync("src/components/FindingAccordion.tsx", "utf8");
    assert.match(section, /heroLead=\{slateHero\}/);
    assert.match(feed, /heroLead/);
    assert.match(accordion, /finding-accordion--hero/);
  });

  it("Hero insight stat cards use larger metrics and muted labels", () => {
    const css = readFileSync("src/styles/season-highlights-delight.css", "utf8");
    assert.match(css, /highlight-stat-card--hero-pill/);
    assert.match(css, /finding-metric-label-muted/);
  });
});
