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
    assert.match(source, /resolveRefProfileTeam/);
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

  it("ClinicalInsightMatrixCard uses directional delta without sample pills", () => {
    const source = readSrc("src/components/ClinicalInsightMatrixCard.tsx");
    assert.match(source, /DirectionalDeltaValue/);
    assert.match(source, /resolveRefProfileTeam/);
    assert.doesNotMatch(source, /SampleConfidencePill/);
    assert.match(source, /clinical-insight-matrix-header/);
    assert.match(source, /clinical-insight-matrix-record/);
    assert.match(source, /text-sm text-slate-300/);
    assert.match(source, /text-sm font-normal text-slate-400/);
    assert.match(source, /recordLine/);
    assert.match(source, /DirectionalDeltaValue/);
    assert.match(source, /font-normal text-slate-400/);
    assert.doesNotMatch(source, /clinical-insight-matrix-provenance/);
    assert.doesNotMatch(source, /Based on .* shared games/);
  });

  it("InsightCard editorial variants use split metric hierarchy for matrix splits", () => {
    const source = readSrc("src/components/shared/InsightCard.tsx");
    assert.match(source, /InsightSplitMetrics/);
    assert.match(source, /formatSampleSizeLabel/);
    assert.match(source, /Sample size \(N\)/);
  });

  it("InsightSplitMetrics keeps sample size white and delta directional", () => {
    const source = readSrc("src/components/shared/InsightSplitMetrics.tsx");
    assert.match(source, /insight-split-sample-value/);
    assert.match(source, /DirectionalDeltaValue/);
    assert.match(source, /insight-split-metrics-row/);
    const css = readSrc("src/components/insight-card.css");
    assert.match(css, /insight-split-metrics-box--sample/);
    assert.match(css, /insight-split-sample-value[\s\S]*color: #fff/);
    assert.match(css, /insight-split-metrics-box--delta/);
    assert.match(css, /insight-split-delta-value--positive/);
  });

  it("InsightMetricComparison uses dual-marker win-rate track for baseline splits", () => {
    const source = readSrc("src/components/shared/InsightMetricComparison.tsx");
    assert.match(source, /insight-metric-comparison-dual-axis/);
    assert.match(source, /insight-metric-comparison-marker--baseline/);
    assert.match(source, /insight-metric-comparison-marker--outcome/);
    assert.match(source, /insight-metric-comparison-gap/);
    const css = readSrc("src/components/insight-card.css");
    assert.match(css, /insight-metric-comparison-dual-axis/);
    assert.match(css, /height: 0\.25rem/);
    assert.match(css, /border-radius: 999px/);
  });

  it("WorldCupFinalSection uses Clinical Modern DataCapsule match header", () => {
    const source = readSrc("src/components/WorldCupFinalSection.tsx");
    assert.match(source, /MatchStatusPill/);
    assert.match(source, /tone="clinical"/);
    assert.match(source, /WorldCupFindingCard/);
    assert.match(source, /wc-data-grid--bento/);
    assert.match(source, /text-3xl font-bold tracking-tight/);
    assert.match(source, /wc-flag-avatar/);
    assert.match(source, /text-slate-400/);
    assert.doesNotMatch(source, /#BFA86A/);
    assert.doesNotMatch(source, /tone="prestige"/);
    assert.doesNotMatch(source, /overview-research-hub-card/);
    assert.doesNotMatch(source, /from "@\/components\/FindingsSection"/);
  });

  it("WorldCupFindingCard uses DataCapsule KPI scale without top pills", () => {
    const card = readSrc("src/components/worldcup/WorldCupFindingCard.tsx");
    const kpi = readSrc("src/components/worldcup/WorldCupKpiValue.tsx");
    assert.match(card, /WorldCupKpiValue/);
    assert.match(kpi, /text-6xl font-black/);
    assert.match(card, /wc-data-capsule/);
    assert.match(card, /text-base font-normal text-slate-400/);
    assert.match(card, /border-slate-800/);
    assert.match(card, /wc-data-capsule--referee/);
    assert.match(card, /wc-data-capsule__footnote/);
    assert.doesNotMatch(card, /wc-data-capsule__pills/);
    assert.doesNotMatch(card, /FindingCategoryPillLabel/);
  });

  it("World Cup DataCapsule surfaces are defined", () => {
    const css = readSrc("src/components/worldcup/worldcup-delight.css");
    assert.match(css, /wc-data-capsule/);
    assert.match(css, /wc-data-grid--bento/);
    assert.match(css, /wc-flag-avatar/);
    assert.match(css, /--wc-capsule-ink/);
    assert.match(css, /html\[data-color="light"\] .wc-data-capsule h3/);
    assert.match(css, /html\[data-color="dark"\] .wc-data-capsule h3/);
    assert.doesNotMatch(css, /wc-data-capsule__pills/);
    assert.doesNotMatch(css, /bfa86a/i);
    assert.doesNotMatch(css, /prestige/i);
  });

  it("MatchStatusPill supports clinical slate capsule styling", () => {
    const source = readSrc("src/components/hub/MatchStatusPill.tsx");
    assert.match(source, /bg-slate-800/);
    assert.match(source, /text-slate-200/);
    assert.match(source, /border-slate-700/);
    assert.match(source, /font-semibold/);
    assert.match(source, /tracking-wider/);
    assert.match(source, /h-\[2\.35rem\]/);
  });

  it("homepage Clinical Modern shell and upcoming game cards are defined", () => {
    const css = readSrc("src/components/overview-clinical-modern.css");
    const page = readSrc("src/app/page.tsx");
    const section = readSrc("src/components/OverviewUpcomingSlateSection.tsx");
    const card = readSrc("src/components/UpcomingGameCard.tsx");
    const row = readSrc("src/components/OverviewSlateRow.tsx");
    assert.match(page, /overview-shell--clinical/);
    assert.match(section, /UpcomingGameCard/);
    assert.match(section, /upcoming-games-grid/);
    assert.doesNotMatch(section, /overview-slate-notes/);
    assert.doesNotMatch(section, /overview-slate-updated/);
    assert.match(card, /gameContextLine/);
    assert.match(card, /upcoming-game-card__context/);
    assert.match(css, /upcoming-game-card__context/);
    assert.match(card, /size="xl"/);
    assert.match(css, /upcoming-game-card/);
    assert.match(readSrc("src/components/overview-slate-shared.css"), /upcoming-games-grid/);
    assert.match(css, /upcoming-game-card__matchup/);
    assert.match(css, /--upcoming-matchup-glow-accent/);
    assert.match(
      css,
      /\.upcoming-game-card__date-pill[\s\S]*var\(--upcoming-matchup-glow\)/,
    );
    assert.match(
      css,
      /\.upcoming-game-card__date-pill[\s\S]*0 0 16px color-mix/,
    );
    assert.match(css, /\[data-league="nfl"\][\s\S]*--upcoming-matchup-glow-accent: #1e4fd4/);
    assert.match(css, /\[data-league="epl"\][\s\S]*--upcoming-matchup-glow-accent: #6b3fa8/);
    assert.match(css, /\[data-league="laliga"\][\s\S]*--upcoming-matchup-glow-accent: #c9a227/);
    assert.match(css, /\.upcoming-game-card__matchup \.team-logo-plate[\s\S]*background: transparent/);
    assert.match(css, /\.upcoming-game-card__matchup \.team-logo-plate[\s\S]*overflow: hidden/);
    assert.match(css, /container-type: inline-size/);
    assert.match(css, /\.upcoming-game-card__league-mark[\s\S]*place-items: center/);
    assert.match(css, /\.upcoming-game-card__league-mark \.league-nav-mark[\s\S]*object-position: center/);
    assert.match(row, /overview-slate-row-last-meeting/);
  });

  it("editorial insight cards show season start except homepage trend splits", () => {
    const source = readSrc("src/components/shared/InsightCard.tsx");
    assert.match(source, /insight-editorial-head-row/);
    assert.match(source, /variant !== "trend"/);
    assert.match(source, /LeagueSeasonStartBadge leagueId=\{card\.leagueId\}/);
  });

  it("OverviewDashboard drops redundant homepage sections", () => {
    const source = readSrc("src/components/OverviewDashboard.tsx");
    assert.doesNotMatch(source, /OverviewHistoricalLeaders/);
    assert.doesNotMatch(source, /Expanding coverage/);
    assert.doesNotMatch(source, /overview-expansion/);
    assert.doesNotMatch(source, /WorldCupFinalSection/);
    assert.doesNotMatch(source, /GameStateIndexFindings/);
    assert.doesNotMatch(source, /ResearchHighlightBanner/);
  });

  it("research highlight banner component stays available for future promos", () => {
    const banner = readSrc("src/components/ResearchHighlightBanner.tsx");
    const config = readSrc("src/config/research-highlight.ts");
    assert.match(banner, /research-highlight-banner/);
    assert.match(config, /Leverage-Spike Anomaly/);
  });

  it("live league date badges use high-contrast blue tokens", () => {
    const css = readSrc("src/app/globals.css");
    assert.match(css, /--live-league-date-ink/);
    assert.match(css, /--live-league-date-bg/);
    assert.match(css, /--live-league-date-border/);
  });

  it("homepage contrast fixes keep muted copy readable", () => {
    const overviewCss = readSrc("src/components/overview-dashboard.css");
    const quicklistsCss = readSrc("src/components/overview-quicklists.css");
    const insightCss = readSrc("src/components/insight-card.css");
    assert.match(overviewCss, /Homepage contrast/);
    assert.match(overviewCss, /overview-slate-row/);
    assert.match(overviewCss, /overview-league-chooser-card\[data-league="nfl"\]/);
    assert.match(overviewCss, /overview-section--secondary .overview-section-lead/);
    assert.match(quicklistsCss, /overview-quicklists-step-label/);
    assert.match(quicklistsCss, /overview-quicklists-context/);
    assert.match(overviewCss, /Explore bento: equal-height catalog \+ analytics columns/);
    assert.match(overviewCss, /overview-secondary-tabs/);
    assert.match(insightCss, /insight-editorial-kicker/);
  });

  it("pill glow tokens are centralized in kpi-data-pill.css", () => {
    const css = readSrc("src/styles/kpi-data-pill.css");
    assert.match(css, /--pill-glow-accent/);
    assert.match(css, /--pill-glow-ring/);
    assert.match(css, /pill-glow-neutral-surface/);
  });
});
