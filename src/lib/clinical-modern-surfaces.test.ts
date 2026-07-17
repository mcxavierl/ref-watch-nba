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

  it("WorldCupFinalSection uses Clinical Modern shell and prestige pill", () => {
    const source = readSrc("src/components/WorldCupFinalSection.tsx");
    assert.match(source, /MatchStatusPill/);
    assert.match(source, /tone="prestige"/);
    assert.match(source, /WorldCupFindingCard/);
    assert.match(source, /bg-slate-950/);
    assert.match(source, /border-slate-800/);
    assert.match(source, /#BFA86A/);
    assert.doesNotMatch(source, /overview-research-hub-card/);
    assert.doesNotMatch(source, /from "@\/components\/FindingsSection"/);
  });

  it("WorldCupFindingCard uses clinical KPI semantics", () => {
    const source = readSrc("src/components/worldcup/WorldCupFindingCard.tsx");
    assert.match(source, /bg-slate-950/);
    assert.match(source, /border-slate-800/);
    assert.match(source, /rounded-2xl/);
    assert.match(source, /text-emerald-400/);
    assert.match(source, /text-rose-400/);
    assert.match(source, /text-slate-100/);
    assert.match(source, /font-normal text-slate-400/);
    assert.match(source, /tabular-nums/);
    assert.match(source, /findingCardMetaParts/);
    assert.match(source, /whitespace-nowrap/);
  });

  it("MatchStatusPill supports clinical and prestige tones", () => {
    const source = readSrc("src/components/hub/MatchStatusPill.tsx");
    assert.match(source, /bg-slate-700/);
    assert.match(source, /text-slate-50/);
    assert.match(source, /bg-\[#BFA86A\]/);
    assert.match(source, /text-white/);
    assert.match(source, /font-semibold/);
    assert.match(source, /tracking-wider/);
    assert.match(source, /h-\[2\.35rem\]/);
  });

  it("OverviewDashboard drops redundant homepage sections", () => {
    const source = readSrc("src/components/OverviewDashboard.tsx");
    assert.doesNotMatch(source, /OverviewHistoricalLeaders/);
    assert.doesNotMatch(source, /Expanding coverage/);
    assert.doesNotMatch(source, /overview-expansion/);
  });

  it("live league date badges use high-contrast blue tokens", () => {
    const css = readSrc("src/app/globals.css");
    assert.match(css, /--live-league-date-ink/);
    assert.match(css, /--live-league-date-bg/);
    assert.match(css, /--live-league-date-border/);
  });

  it("pill glow tokens are centralized in kpi-data-pill.css", () => {
    const css = readSrc("src/styles/kpi-data-pill.css");
    assert.match(css, /--pill-glow-accent/);
    assert.match(css, /--pill-glow-ring/);
    assert.match(css, /pill-glow-neutral-surface/);
  });
});
