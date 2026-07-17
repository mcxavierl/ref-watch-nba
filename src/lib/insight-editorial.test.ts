import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorialInsightView,
  humanCentricHeadline,
  insightConfidenceScore,
  insightDataMaturityScore,
  insightMetricComparison,
  overviewStandoutSplitCards,
  pickTopInsightCard,
  quickInsightCards,
  trendInsightCards,
} from "@/lib/insight-editorial";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

function sampleCard(
  overrides: Partial<LeagueInsightCard> = {},
): LeagueInsightCard {
  return {
    leagueId: "nfl",
    label: "NFL",
    shortLabel: "NFL",
    kind: "ref-outlier",
    kicker: "Whistle outlier",
    headline: "Dale Shaw beats baseline",
    story:
      "Dale Shaw averages 12.1 flags per game across 84 verified games. Useful when comparing crew pace before kickoff.",
    heroValue: "+51.5pp",
    heroLabel: "Flags variance vs league",
    heroTone: "positive",
    stats: [
      { label: "Flags per game", value: "12.1" },
      { label: "Sample", value: "84 games" },
    ],
    links: [{ label: "Ref profile", href: "/nfl/refs/dale-shaw" }],
    entityName: "Dale Shaw",
    entityHref: "/nfl/refs/dale-shaw",
    refSlug: "dale-shaw",
    ...overrides,
  };
}

describe("insight editorial helpers", () => {
  it("prefers narrative headlines when already human-centric", () => {
    const headline = humanCentricHeadline(
      sampleCard({
        headline:
          "Alex Moore is pacing 18.2% above league average for flags in NFL",
      }),
    );
    assert.match(headline, /Alex Moore is pacing/);
  });

  it("builds whistle outlier headlines from entity names", () => {
    const headline = humanCentricHeadline(sampleCard());
    assert.equal(headline, "Dale Shaw calls one of the NFL's highest whistle rates");
    assert.ok(!headline.includes("—"));
  });

  it("maps cards to headline, metrics, and why-it-matters", () => {
    const view = editorialInsightView(sampleCard());
    assert.equal(view.headline, "Dale Shaw calls one of the NFL's highest whistle rates");
    assert.equal(view.primaryMetric.value, "+51.5pp");
    assert.equal(view.secondaryMetric?.label, "Flags per game");
    assert.ok(view.whyItMatters.length > 20);
  });

  it("builds homepage standout grid with extra NBA, NFL, and EPL samples", () => {
    const featured = sampleCard({
      leagueId: "nba",
      shortLabel: "NBA",
      kind: "matrix-edge",
      entityName: "Brandon Schwab",
      refSlug: "brandon-schwab",
      teamAbbr: "SAC",
      heroValue: "+20.1pp",
      stats: [
        { label: "Ref×team record", value: "8-0" },
        { label: "Games", value: "8" },
        { label: "Team baseline", value: "42.2%" },
      ],
    });
    const cards = [
      featured,
      sampleCard({
        leagueId: "nba",
        shortLabel: "NBA",
        kind: "matrix-edge",
        entityName: "Scott Twardoski",
        refSlug: "scott-twardoski",
        teamAbbr: "NYK",
        heroValue: "+45.2pp",
        stats: [
          { label: "Ref×team record", value: "17-2" },
          { label: "Games", value: "19" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "nba",
        shortLabel: "NBA",
        kind: "matrix-edge",
        entityName: "Natalie Sago",
        refSlug: "natalie-sago",
        teamAbbr: "MIN",
        heroValue: "+41.0pp",
        stats: [
          { label: "Ref×team record", value: "17-2" },
          { label: "Games", value: "19" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "nfl",
        shortLabel: "NFL",
        kind: "matrix-edge",
        entityName: "Ryan Dickson",
        refSlug: "ryan-dickson",
        teamAbbr: "MIA",
        heroValue: "+42.4pp",
        stats: [
          { label: "Ref×team record", value: "10-1" },
          { label: "Games", value: "11" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "nfl",
        shortLabel: "NFL",
        kind: "matrix-edge",
        entityName: "Scott Green",
        refSlug: "scott-green",
        teamAbbr: "CHI",
        heroValue: "+47.7pp",
        stats: [
          { label: "Ref×team record", value: "8-1" },
          { label: "Games", value: "9" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "epl",
        shortLabel: "EPL",
        kind: "matrix-edge",
        entityName: "Martin Atkinson",
        refSlug: "martin-atkinson",
        teamAbbr: "ARS",
        heroValue: "-30.2pp",
        stats: [
          { label: "Ref×team record", value: "9-13" },
          { label: "Games", value: "22" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "epl",
        shortLabel: "EPL",
        kind: "matrix-edge",
        entityName: "Paul Tierney",
        refSlug: "paul-tierney",
        teamAbbr: "TOT",
        heroValue: "-32.5pp",
        stats: [
          { label: "Ref×team record", value: "5-13" },
          { label: "Games", value: "18" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "nhl",
        shortLabel: "NHL",
        kind: "matrix-edge",
        entityName: "John Grandt",
        refSlug: "john-grandt",
        teamAbbr: "COL",
        heroValue: "+12.0pp",
        stats: [
          { label: "Ref×team record", value: "6-3" },
          { label: "Games", value: "9" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
      sampleCard({
        leagueId: "laliga",
        shortLabel: "La Liga",
        kind: "matrix-edge",
        entityName: "Guillermo Cuadra",
        refSlug: "guillermo-cuadra-fernandez",
        teamAbbr: "VIL",
        heroValue: "+18.0pp",
        stats: [
          { label: "Ref×team record", value: "6-2" },
          { label: "Games", value: "8" },
          { label: "Team baseline", value: "48.0%" },
        ],
      }),
    ];

    const grid = overviewStandoutSplitCards(cards, featured);
    assert.equal(grid.length, 8);
    assert.equal(grid.filter((card) => card.leagueId === "nba").length, 2);
    assert.equal(grid.filter((card) => card.leagueId === "nfl").length, 2);
    assert.equal(grid.filter((card) => card.leagueId === "epl").length, 2);
    assert.ok(grid.every((card) => card.entityName !== "Brandon Schwab"));
    assert.equal(grid[0]?.entityName, "Scott Twardoski");
    assert.equal(grid[grid.length - 1]?.entityName, "Paul Tierney");
  });

  it("picks top insight and trend sets", () => {
    const cards = [
      sampleCard({ heroValue: "+8.2pp", leagueId: "nba", shortLabel: "NBA" }),
      sampleCard({ heroValue: "+51.5pp" }),
      sampleCard({
        heroValue: "+12.0pp",
        leagueId: "nhl",
        shortLabel: "NHL",
        entityName: "John Grandt",
      }),
    ];
    assert.equal(pickTopInsightCard(cards)?.entityName, "Dale Shaw");
    assert.equal(trendInsightCards(cards).length, 3);
    assert.equal(quickInsightCards(cards, 2).length, 2);
  });

  it("builds crew vs league comparison for whistle outliers", () => {
    const comparison = insightMetricComparison(sampleCard());
    assert.ok(comparison);
    assert.equal(comparison?.format, "decimal");
    assert.equal(comparison?.crewValue, 12.1);
    assert.ok((comparison?.leagueValue ?? 0) < comparison!.crewValue);
  });

  it("builds delta-vs-baseline comparison for matrix-edge cards", () => {
    const comparison = insightMetricComparison(
      sampleCard({
        kind: "matrix-edge",
        heroValue: "+51.5pp",
        heroLabel: "Win rate vs team baseline",
        stats: [
          { label: "Ref×team record", value: "8-0" },
          { label: "Games", value: "8" },
          { label: "Team baseline", value: "48.5%" },
        ],
      }),
    );
    assert.ok(comparison);
    assert.equal(comparison?.format, "pct");
    assert.ok((comparison?.deltaPp ?? 0) < 51.5);
    assert.equal(comparison?.refWinRate, 100);
    assert.equal(comparison?.teamBaseline, 48.5);
    assert.equal(comparison?.crewValue, comparison?.deltaPp);
    assert.equal(comparison?.leagueValue, 48.5);
  });

  it("derives negative delta from ref win rate and team baseline", () => {
    const comparison = insightMetricComparison(
      sampleCard({
        kind: "matrix-edge",
        heroValue: "-12.0pp",
        heroLabel: "Win rate vs team baseline",
        stats: [
          { label: "Ref×team record", value: "2-6" },
          { label: "Games", value: "18" },
          { label: "Team baseline", value: "37.0%" },
        ],
      }),
    );
    assert.ok(comparison);
    assert.equal(comparison?.deltaPp, -12);
    assert.equal(comparison?.refWinRate, 25);
    assert.equal(comparison?.teamBaseline, 37);
  });

  it("prioritizes sample size and shrunk delta for thin matrix-edge cards", () => {
    const view = editorialInsightView(
      sampleCard({
        kind: "matrix-edge",
        heroValue: "+51.5pp",
        heroLabel: "Win rate vs team baseline",
        stats: [
          { label: "Ref×team record", value: "8-0" },
          { label: "Games", value: "8" },
          { label: "Team baseline", value: "48.5%" },
        ],
      }),
    );
    assert.equal(view.primaryMetric.value, "8 games");
    assert.equal(view.primaryMetric.label, "Sample size");
    assert.equal(view.secondaryMetric?.label, "Win rate delta");
    assert.ok(view.isPreliminary);
    assert.ok(view.showHonestyFootnote);
  });

  it("keeps raw delta for mature matrix-edge samples", () => {
    const view = editorialInsightView(
      sampleCard({
        kind: "matrix-edge",
        heroValue: "+18.0pp",
        heroLabel: "Win rate vs team baseline",
        stats: [
          { label: "Ref×team record", value: "12-6" },
          { label: "Games", value: "18" },
          { label: "Team baseline", value: "48.5%" },
        ],
      }),
    );
    assert.equal(view.primaryMetric.value, "18 games");
    assert.equal(view.secondaryMetric?.value, "+18.0pp");
    assert.equal(view.secondaryMetric?.label, "Win rate delta");
    assert.equal(view.isPreliminary, false);
  });

  it("returns sample games for data maturity bar input", () => {
    const thin = insightDataMaturityScore(
      sampleCard({ stats: [{ label: "Sample", value: "8 games" }] }),
    );
    const strong = insightDataMaturityScore(
      sampleCard({ stats: [{ label: "Sample", value: "120 games" }] }),
    );
    assert.equal(thin, 8);
    assert.equal(strong, 120);
    assert.ok(thin < strong);
    assert.equal(insightConfidenceScore(sampleCard()), insightDataMaturityScore(sampleCard()));
  });
});
