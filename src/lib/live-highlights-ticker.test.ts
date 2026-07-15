import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLiveHighlightTickerItems } from "@/lib/live-highlights-ticker";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

function sampleCard(
  overrides: Partial<LeagueInsightCard> & Pick<LeagueInsightCard, "leagueId">,
): LeagueInsightCard {
  return {
    label: "NBA",
    shortLabel: "NBA",
    kind: "matrix-edge",
    kicker: "Standout ref×team split",
    headline: "Sample headline",
    story: "Sample story",
    heroValue: "+8.2pp",
    heroLabel: "Win rate vs team baseline",
    heroTone: "positive",
    stats: [],
    links: [{ label: "Open matrix", href: "/matrix" }],
    entityName: "John Goble",
    entityHref: "/refs/john-goble",
    refSlug: "john-goble",
    teamAbbr: "SAC",
    ...overrides,
  };
}

describe("buildLiveHighlightTickerItems", () => {
  it("formats matrix-edge copy and excludes non-pro leagues", () => {
    const items = buildLiveHighlightTickerItems([
      sampleCard({ leagueId: "nba", entityName: "John Goble", heroValue: "+8.2pp" }),
      sampleCard({
        leagueId: "cbb",
        shortLabel: "CBB",
        entityName: "Tony Henderson",
        heroValue: "-49.4pp",
      }),
      sampleCard({
        leagueId: "nfl",
        shortLabel: "NFL",
        entityName: "Dale Shaw",
        heroValue: "+51.5pp",
        entityHref: "/nfl/refs/dale-shaw",
      }),
    ]);

    assert.equal(items.length, 2);
    assert.equal(items[0]?.leagueLabel, "NBA");
    assert.equal(items[0]?.copy, "John Goble +8.2pp vs baseline");
    assert.equal(items[1]?.leagueLabel, "NFL");
    assert.ok(!items.some((item) => item.leagueId === "cbb"));
    assert.ok(!items[0]?.copy.includes("—"));
  });

  it("caps output at the requested limit", () => {
    const cards = Array.from({ length: 12 }, (_, index) =>
      sampleCard({
        leagueId: "nba",
        entityName: `Ref ${index}`,
        refSlug: `ref-${index}`,
        headline: `Headline ${index}`,
      }),
    );
    assert.equal(buildLiveHighlightTickerItems(cards, 8).length, 8);
  });
});
