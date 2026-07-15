import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  editorialInsightView,
  humanCentricHeadline,
  insightConfidenceScore,
  insightMetricComparison,
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
    assert.equal(comparison?.deltaPp, 51.5);
    assert.equal(comparison?.refWinRate, 100);
    assert.equal(comparison?.teamBaseline, 48.5);
    assert.equal(comparison?.crewValue, 51.5);
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
          { label: "Games", value: "8" },
          { label: "Team baseline", value: "37.0%" },
        ],
      }),
    );
    assert.ok(comparison);
    assert.equal(comparison?.deltaPp, -12);
    assert.equal(comparison?.refWinRate, 25);
    assert.equal(comparison?.teamBaseline, 37);
  });

  it("scores confidence from sample depth", () => {
    const thin = insightConfidenceScore(
      sampleCard({ stats: [{ label: "Sample", value: "8 games" }] }),
    );
    const strong = insightConfidenceScore(
      sampleCard({ stats: [{ label: "Sample", value: "120 games" }] }),
    );
    assert.ok(thin < strong);
    assert.ok(thin >= 5 && thin <= 100);
    assert.ok(strong >= 5 && strong <= 100);
  });
});
