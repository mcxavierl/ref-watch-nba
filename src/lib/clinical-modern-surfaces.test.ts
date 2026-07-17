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

  it("WorldCupFinalSection uses authority match capsule", () => {
    const source = readSrc("src/components/WorldCupFinalSection.tsx");
    assert.match(source, /MatchStatusPill/);
    assert.match(source, /tone="prestige"/);
    assert.match(source, /WorldCupFindingCard/);
    assert.match(source, /text-5xl font-extrabold tracking-tighter/);
    assert.match(source, /wc-flag-avatar/);
    assert.match(source, /text-xs text-slate-600/);
    assert.doesNotMatch(source, /overview-research-hub-card/);
    assert.doesNotMatch(source, /from "@\/components\/FindingsSection"/);
  });

  it("WorldCupFindingCard uses authority KPI scale and semantic tones", () => {
    const card = readSrc("src/components/worldcup/WorldCupFindingCard.tsx");
    const kpi = readSrc("src/components/worldcup/WorldCupKpiValue.tsx");
    assert.match(card, /WorldCupKpiValue/);
    assert.match(kpi, /text-7xl font-black/);
    assert.match(card, /bg-slate-800/);
    assert.match(card, /text-slate-300/);
    assert.match(card, /border-slate-800/);
    assert.match(card, /wc-authority-capsule--referee/);
  });

  it("World Cup editorial delight surfaces are defined", () => {
    const css = readSrc("src/components/worldcup/worldcup-delight.css");
    assert.match(css, /wc-authority-capsule/);
    assert.match(css, /wc-flag-avatar/);
    assert.match(css, /match-status-pill--prestige/);
    assert.match(css, /--wc-capsule-ink/);
    assert.match(css, /html\[data-color="light"\] .wc-authority-capsule h3/);
    assert.match(css, /html\[data-color="dark"\] .wc-authority-capsule h3/);
    assert.match(css, /wc-authority-capsule--referee h3/);
  });

  it("MatchStatusPill supports clinical and prestige tones", () => {
    const source = readSrc("src/components/hub/MatchStatusPill.tsx");
    assert.match(source, /bg-slate-700/);
    assert.match(source, /text-slate-50/);
    assert.match(source, /match-status-pill--prestige/);
    assert.match(source, /bg-\[#BFA86A\]/);
    assert.match(source, /text-white/);
    assert.match(source, /font-semibold/);
    assert.match(source, /tracking-wider/);
    assert.match(source, /h-\[2\.35rem\]/);
  });

  it("editorial insight cards pair league badge with season start", () => {
    const source = readSrc("src/components/shared/InsightCard.tsx");
    assert.match(source, /insight-editorial-head-row/);
    assert.match(source, /LeagueSeasonStartBadge leagueId=\{card\.leagueId\}/);
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

  it("homepage contrast fixes keep muted copy readable", () => {
    const overviewCss = readSrc("src/components/overview-dashboard.css");
    const insightCss = readSrc("src/components/insight-card.css");
    assert.match(overviewCss, /Homepage contrast/);
    assert.match(overviewCss, /overview-slate-row/);
    assert.match(overviewCss, /overview-league-chooser-card\[data-league="nfl"\]/);
    assert.match(overviewCss, /overview-section--secondary .overview-section-lead/);
    assert.match(insightCss, /insight-editorial-kicker/);
  });

  it("pill glow tokens are centralized in kpi-data-pill.css", () => {
    const css = readSrc("src/styles/kpi-data-pill.css");
    assert.match(css, /--pill-glow-accent/);
    assert.match(css, /--pill-glow-ring/);
    assert.match(css, /pill-glow-neutral-surface/);
  });
});
