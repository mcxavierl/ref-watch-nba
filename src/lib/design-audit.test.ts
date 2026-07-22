import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

  it("homepage intelligence hero leads with briefing stack and proof metrics", () => {
    const hero = readSrc("src/components/OverviewIntelligenceHero.tsx");
    const banner = readSrc("src/components/dashboard/IntelligenceHero.tsx");
    const dashboard = readSrc("src/components/OverviewDashboard.tsx");
    const page = readSrc("src/app/page.tsx");
    assert.match(hero, /IntelligenceHero/);
    assert.match(banner, /Officiating Intelligence/);
    assert.match(banner, /overview-hero-minimal|overview-hero-polished/);
    assert.match(banner, /intelligence-hero-heading/);
    assert.doesNotMatch(banner, /intelligence-hero-surface/);
    assert.doesNotMatch(banner, /OFFICIATING DECISION/);
    if (hero.includes("GoldMineProofBar")) {
      assert.match(hero, /DailyBriefingBanner/);
      assert.match(banner, /overview-hero-kicker/);
    }
    assert.doesNotMatch(dashboard, /TopSignal/);
    assert.match(page, /OverviewIntelligenceHero/);
    assert.match(dashboard, /OverviewUpcomingSlateSection/);
    assert.match(dashboard, /OverviewResearchFooter/);
    const footer = readSrc("src/components/OverviewResearchFooter.tsx");
    assert.match(footer, /OverviewTopInsightsSection/);
    assert.match(footer, /LeagueChooser/);
  });

  it("ref profile narrative surfaces officiating fingerprint at the top", () => {
    const layout = readSrc("src/components/ref-profile/RefProfileNarrativeLayout.tsx");
    const visual = readSrc("src/components/visuals/OfficiatingFingerprint.tsx");
    assert.match(layout, /RefProfileFingerprintSection/);
    assert.match(visual, /Officiating Fingerprint/);
    assert.match(visual, /officiating-fingerprint-data/);
  });

  it("game preview drawer exposes fingerprint visual tab", () => {
    const drawer = readSrc("src/components/GameSlatePreviewDrawer.tsx");
    const terminal = readSrc("src/components/MatchupPreviewTerminal.tsx");
    const panel = readSrc("src/components/visuals/GameSlateFingerprintPanel.tsx");
    const preview = readSrc("src/lib/game-slate-preview.ts");
    assert.match(drawer, /MatchupPreviewTerminal/);
    assert.match(terminal, /GameSlateFingerprintPanel/);
    assert.match(terminal, /matchup-terminal-fingerprint-section/);
    assert.match(terminal, /Officiating fingerprint/);
    assert.match(panel, /type="button"/);
    assert.match(panel, /OverlayNavLink/);
    assert.match(panel, /basePath/);
    assert.match(preview, /crewFingerprints/);
  });

  it("matchup preview terminal stacks compact driver lists inside narrow drawer", () => {
    const css = readSrc("src/components/matchup-preview-terminal.css");
    const drawer = readSrc("src/components/GameSlatePreviewDrawer.tsx");
    const terminal = readSrc("src/components/MatchupPreviewTerminal.tsx");
    assert.match(css, /matchup-terminal-drivers-grid/);
    assert.match(css, /matchup-terminal-accordions/);
    assert.match(drawer, /MatchupPreviewTerminal/);
    assert.match(terminal, /Why the model thinks this/);
    assert.match(terminal, /details className="matchup-terminal-accordion"/);
  });

  it("avoids raw slate text utilities on about page", () => {
    const about = readSrc("src/app/about/page.tsx");
    assert.doesNotMatch(about, /text-slate-/);
    assert.doesNotMatch(about, /\bmt-\d+/);
    assert.match(about, /clinical-doc-section/);
    assert.match(about, /clinical-doc-shell/);
  });

  it("doc pages use unified clinical-doc-shell", () => {
    for (const file of [
      "src/app/about/page.tsx",
      "src/app/methodology/page.tsx",
      "src/app/research/validation/page.tsx",
    ]) {
      const page = readSrc(file);
      assert.match(page, /clinical-doc-shell/);
      assert.doesNotMatch(page, /methodology-shell overview-shell--clinical/);
    }
  });

  it("quicklists styles live in overview-quicklists.css", () => {
    const quicklists = readSrc("src/components/overview-quicklists.css");
    const dashboard = readSrc("src/components/overview-dashboard.css");
    const globals = readSrc("src/app/globals.css");
    assert.match(quicklists, /\.overview-quicklists-segmented/);
    assert.match(dashboard, /overview-quicklists\.css/);
    assert.doesNotMatch(globals, /\.overview-quicklists-segmented/);
  });

  it("validation table rows expose mobile data-label attributes", () => {
    const content = readSrc("src/components/ValidationReportContent.tsx");
    assert.match(content, /data-label="Bucket"/);
    const css = readSrc("src/components/validation-report.css");
    assert.match(css, /attr\(data-label\)/);
  });

  it("league hub upcoming slate uses interactive upcoming game cards", () => {
    const hub = readSrc("src/components/LeagueHubUpcomingSlateSection.tsx");
    assert.match(hub, /LiveSlateGrid|OverviewSlateGamesInteractive/);
    assert.doesNotMatch(hub, /LeagueSlateGamesList/);
    if (hub.includes("LiveSlateGrid")) {
      assert.ok(
        existsSync("src/components/LiveSlateGrid.tsx"),
        "LiveSlateGrid.tsx required when hub imports LiveSlateGrid",
      );
      const grid = readSrc("src/components/LiveSlateGrid.tsx");
      assert.match(grid, /OverviewSlateGamesInteractive/);
      assert.match(grid, /upcoming-games-grid/);
    } else {
      assert.match(hub, /upcoming-games-grid/);
    }
  });

  it("slate team display helpers are shared across card and row", () => {
    const shared = readSrc("src/lib/slate-team-display.ts");
    const card = readSrc("src/components/SlateGameCard.tsx");
    const row = readSrc("src/components/OverviewSlateRow.tsx");
    assert.match(shared, /resolveSlateTeam/);
    assert.match(card, /slate-team-display/);
    assert.match(row, /slate-team-display/);
    assert.doesNotMatch(card, /function resolveTeam/);
  });

  it("upcoming slate layout CSS lives in overview-slate-shared.css", () => {
    const shared = readSrc("src/components/overview-slate-shared.css");
    const dashboard = readSrc("src/components/overview-dashboard.css");
    const clinical = readSrc("src/components/overview-clinical-modern.css");
    assert.match(shared, /upcoming-games-grid/);
    assert.match(dashboard, /overview-slate-shared\.css/);
    assert.match(clinical, /overview-slate-shared\.css/);
    assert.doesNotMatch(dashboard, /\.upcoming-games-grid/);
  });

  it("live league hubs wire upcoming slate cards below the hero", () => {
    const slate = readSrc("src/components/LeagueSlatePage.tsx");
    assert.match(slate, /LeagueHubUpcomingSlateSection/);
    assert.match(slate, /loadLeagueHubUpcomingSlateFromSnapshot/);
    assert.match(slate, /leagueLabel=\{entry\.shortLabel\}/);

    const route = readSrc("src/app/[league]/page.tsx");
    assert.match(route, /LeagueSlatePage/);
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

  it("pill surfaces enforce shared containment utilities", () => {
    const css = readSrc("src/styles/pill-constraints.css");
    const gsni = readSrc("src/components/GsniBandBadge.tsx");
    assert.match(css, /--pill-padding-y/);
    assert.match(css, /\.finding-angle-category/);
    assert.match(gsni, /gsniCategoryLabel/);
    assert.match(gsni, /<Pill variant="category"/);
    assert.match(readSrc("src/components/ConfidenceTierBadge.tsx"), /pill-constrain-text/);
  });

  it("theme matrix contrast audit is wired for CI", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:theme-matrix"] ?? "", /audit-theme-matrix/);
    assert.match(pkg.scripts?.["audit:design-ship"] ?? "", /audit-design-ship/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:design-ship/);
    assert.match(readSrc("scripts/audit-design-ship.ts"), /audit:theme-matrix/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Design ship audit/);
    assert.match(readSrc("src/app/theme-matrix/page.tsx"), /WorldCupFinalSection/);
    assert.match(readSrc("src/app/robots.ts"), /\/theme-matrix/);
    assert.match(readSrc("scripts/lib/theme-matrix-config.ts"), /name: "homepage"/);
    assert.match(readSrc("scripts/lib/theme-matrix-config.ts"), /name: "nba-hub"/);
    assert.match(readSrc("scripts/lib/theme-matrix-config.ts"), /name: "theme-matrix-fixture"/);
  });

  it("color drift audit guards clinical surfaces and hex allowlists", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:color-drift"] ?? "", /audit-color-drift/);
    assert.match(readSrc("scripts/audit-design-ship.ts"), /audit:color-drift/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Design ship audit/);
    assert.match(readSrc("src/components/hub/ClinicalCard.tsx"), /border-subtle/);
    assert.doesNotMatch(readSrc("src/components/hub/ClinicalCard.tsx"), /border-\[#/);
  });

  it("brand surface audit guards header, OG accents, and league logos", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:brand-surfaces"] ?? "", /audit-brand-surfaces/);
    assert.match(readSrc("scripts/audit-design-ship.ts"), /audit:brand-surfaces/);
    assert.match(readSrc("src/components/SiteHeader.tsx"), /site-header-brand/);
    assert.match(readSrc("src/lib/og-brand.ts"), /OG_LEAGUE_ACCENTS/);
    assert.match(readSrc("src/components/LeagueHeroLogo.tsx"), /leagueLogoSrc/);
    assert.match(readSrc("src/lib/league-logo-src.ts"), /\/logos\/nba-logo\.svg/);
  });

  it("design token parity audit guards clinical, accent, and wc tokens", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:design-tokens"] ?? "", /audit-design-tokens/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:design-tokens/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Design token parity audit/);
    assert.match(readSrc("src/app/globals.css"), /--wc-gold:\s*var\(--wc-research-accent\)/);
    assert.match(readSrc("figma/design-tokens.json"), /"semantic"/);
  });

  it("clinical card consistency audit guards hub primitives and ref-card wiring", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:card-consistency"] ?? "", /audit-card-consistency/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:card-consistency/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Clinical card consistency audit/);
    assert.match(readSrc("src/components/hub/RefCard.tsx"), /CLINICAL MODERN STANDARD/);
    assert.match(readSrc("src/components/hub/ClinicalCard.tsx"), /backdrop-blur-md/);
  });

  it("site navigation avoids next/link in shared chrome and homepage surfaces", () => {
    const files = [
      "src/components/SiteFooter.tsx",
      "src/components/OverviewResearchFooter.tsx",
      "src/components/OverviewQuickLists.tsx",
      "src/components/CommandPalette.tsx",
      "src/components/PrefetchLink.tsx",
    ];
    for (const file of files) {
      const source = readSrc(file);
      assert.doesNotMatch(source, /from "next\/link"/, `${file} should use hard anchors`);
    }
    assert.match(readSrc("src/components/PrefetchLink.tsx"), /SiteNavLink/);
  });

  it("renders league section nav inside sticky site header", () => {
    const header = readSrc("src/components/SiteHeader.tsx");
    const layout = readSrc("src/app/[league]/layout.tsx");
    assert.match(header, /site-header-nav/);
    assert.match(header, /LeagueSectionNav/);
    assert.doesNotMatch(layout, /LeagueSectionNav/);
    assert.match(readSrc("src/app/globals.css"), /\.site-header-inner:has\(\.site-header-nav:not\(:empty\)\)/);
  });

  it("metric semantics audit guards chart scales and delta visualization", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:metric-semantics"] ?? "", /audit-metric-semantics/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:metric-semantics/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Metric semantics audit/);
    assert.match(readSrc("src/components/shared/InsightMetricComparison.tsx"), /insight-metric-comparison-dual-axis/);
    assert.match(readSrc("src/components/FindingCardLayout.tsx"), /DirectionalDeltaValue/);
  });

  it("em dash copy audit blocks unicode em dashes in user-facing copy", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["check:no-em-dashes"] ?? "", /check-no-em-dashes/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /check:no-em-dashes/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Em dash copy audit/);
    assert.match(readSrc(".cursor/rules/no-em-dashes.mdc"), /Never use em dashes/);
  });

  it("terminal integrity CSS is loaded for ref-profile and matrix surfaces", () => {
    const globals = readSrc("src/app/globals.css");
    const integrity = readSrc("src/components/terminal-integrity.css");
    assert.match(globals, /terminal-integrity\.css/);
    assert.match(integrity, /\.ref-profile-trend-rate-pill/);
    assert.match(integrity, /\.team-ref-matrix-head > \.team-ref-matrix-head-stat/);
    assert.match(integrity, /var\(--space-2\)/);
  });

  it("matrix and ref-profile components enforce pill padding and tabular alignment", () => {
    const matrixRow = readSrc("src/components/analytics/MatrixRow.tsx");
    const matrixView = readSrc("src/components/analytics/MatrixView.tsx");
    const teamTrends = readSrc("src/components/ref-profile/RefProfileTeamTrends.tsx");
    const trendCards = readSrc("src/components/ref-profile/RefProfileTrendCards.tsx");

    assert.match(matrixRow, /tabular-nums text-right/);
    assert.match(matrixRow, /shrink-0/);
    assert.match(matrixRow, /truncate/);
    assert.match(matrixView, /whitespace-nowrap px-3/);
    assert.match(teamTrends, /whitespace-nowrap px-3/);
    assert.match(teamTrends, /shrink-0/);
    assert.match(trendCards, /whitespace-nowrap px-3/);
  });

  it("terminal integrity audit is wired for CI", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:terminal-integrity"] ?? "", /audit-terminal-integrity/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:terminal-integrity/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Terminal integrity audit/);
  });

  it("insight-first audit guards narrative layout and anomaly gates", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:insight-first"] ?? "", /audit-insight-first/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:insight-first/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Insight-first audit/);
    assert.match(readSrc("src/components/ref-profile/RefProfileNarrativeLayout.tsx"), /ref-narrative-layout/);
    assert.match(readSrc("src/lib/anomaly-surface.ts"), /ANOMALY_VARIANCE_THRESHOLD/);
    assert.match(readSrc("src/components/RefRankingsTable.tsx"), /Anomalies only/);
  });

  it("highlight integrity audit guards materiality gates across live leagues", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:highlight-integrity"] ?? "", /audit-highlight-integrity/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:highlight-integrity/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Highlight integrity audit/);
    assert.match(readSrc("src/lib/highlight-badge.ts"), /HIGHLIGHT_OVER_RATE_DEVIATION_TOP_TIER/);
    assert.match(readSrc("src/lib/highlight-integrity-audit.ts"), /auditRankingsHighlightGrid/);
  });

  it("overlay portal audit guards ModalPortal usage on full-screen overlays", () => {
    const pkg = JSON.parse(readSrc("package.json")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:overlay-portals"] ?? "", /audit-overlay-portals/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:overlay-portals/);
    assert.match(readSrc(".github/workflows/ci.yml"), /Overlay portal audit/);
    assert.match(readSrc("src/components/ModalPortal.tsx"), /document\.body/);
    assert.match(readSrc("src/components/CommandPalette.tsx"), /<ModalPortal>/);
    assert.match(readSrc("src/components/InsightDrilldownModal.tsx"), /<ModalPortal>/);
  });
});
