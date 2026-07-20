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

  it("league hub upcoming slate uses UpcomingGameCard grid", () => {
    const hub = readSrc("src/components/LeagueHubUpcomingSlateSection.tsx");
    assert.match(hub, /UpcomingGameCard/);
    assert.match(hub, /upcoming-games-grid/);
    assert.doesNotMatch(hub, /LeagueSlateGamesList/);
  });

  it("slate team display helpers are shared across card and row", () => {
    const shared = readSrc("src/lib/slate-team-display.ts");
    const card = readSrc("src/components/UpcomingGameCard.tsx");
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
    assert.match(slate, /buildLeagueHubUpcomingSchedule/);
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
});
