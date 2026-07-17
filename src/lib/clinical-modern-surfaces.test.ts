import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Clinical Modern priority #11 surfaces", () => {
  it("GameSlateCard uses clinical shell and semantic deltas", () => {
    const source = readSrc("src/components/GameSlateCard.tsx");
    assert.match(source, /CLINICAL_CARD_CLASS/);
    assert.match(source, /StatusBadge/);
    assert.match(source, /signedDeltaTone/);
    assert.match(source, /StandoutMetricValue/);
  });

  it("TeamSplitView uses Clinical Modern metrics without Balanced pills", () => {
    const source = readSrc("src/components/TeamSplitView.tsx");
    assert.match(source, /REF_CARD_CLASS/);
    assert.match(source, /StandoutMetricValue/);
    assert.match(source, /NeutralDivergenceBar/);
    assert.match(source, /clinical-insight-matrix-avatars/);
    assert.doesNotMatch(source, /Balanced/);
    assert.doesNotMatch(source, /MetricBlock/);
  });

  it("TeamPageInsights uses shared InsightCard editorial shell", () => {
    const source = readSrc("src/components/TeamPageInsights.tsx");
    assert.match(source, /InsightCard/);
    assert.match(source, /overview-editorial-narrative/);
    assert.match(source, /variant="featured"/);
    assert.doesNotMatch(source, /ClinicalCard/);
    assert.doesNotMatch(source, /StandoutFlag/);
  });

  it("NcaaAuditStatusPill delegates to shared StatusBadge", () => {
    const source = readSrc("src/components/NcaaAuditStatusPill.tsx");
    assert.match(
      source,
      /from "@\/components\/hub\/StatusBadge"/,
    );
    assert.doesNotMatch(source, /ncaa-audit-status-pill-icon/);
  });

  it("TeamEdgeSummaryCard uses Clinical Modern hub primitives", () => {
    const source = readSrc("src/components/team-hub/TeamEdgeSummaryCard.tsx");
    assert.match(source, /ClinicalCard/);
    assert.match(source, /StatusBadge/);
    assert.match(source, /signedDeltaTone/);
  });

  it("WhistlePremiumSection uses ClinicalCard and StatusBadge", () => {
    const source = readSrc("src/components/WhistlePremiumSection.tsx");
    assert.match(source, /ClinicalCard/);
    assert.match(source, /StatusBadge/);
    assert.match(source, /signedDeltaTone/);
  });

  it("ClinicalInsightMatrixCard uses sample confidence pills without provenance footer", () => {
    const source = readSrc("src/components/ClinicalInsightMatrixCard.tsx");
    assert.match(source, /SampleConfidencePill/);
    assert.match(source, /clinical-insight-matrix-header/);
    assert.match(source, /clinical-insight-matrix-record/);
    assert.match(source, /text-sm text-slate-300/);
    assert.match(source, /text-sm text-slate-400/);
    assert.match(source, /recordLine/);
    assert.match(source, /text-3xl/);
    assert.match(source, /tabular-nums/);
    assert.doesNotMatch(source, /clinical-insight-matrix-provenance/);
    assert.doesNotMatch(source, /Based on .* shared games/);
  });

  it("pill glow tokens are centralized in kpi-data-pill.css", () => {
    const css = readSrc("src/styles/kpi-data-pill.css");
    assert.match(css, /--pill-glow-accent/);
    assert.match(css, /--pill-glow-ring/);
    assert.match(css, /pill-glow-neutral-surface/);
  });
});
