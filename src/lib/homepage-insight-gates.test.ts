import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATS_OU_CLOSING_LINE_MIN_GAMES,
  CREW_ANOMALY_MIN_GAMES,
  REF_TEAM_SPLIT_MIN_GAMES,
} from "@/config/methodology";
import {
  filterHomepageInsightCards,
  homepageInsightCategory,
  homepageInsightKicker,
  isStatisticallySignificantInsight,
  passesHomepageSampleGate,
} from "@/lib/homepage-insight-gates";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

function matrixCard(games: number, overrides: Partial<LeagueInsightCard> = {}): LeagueInsightCard {
  return {
    leagueId: "nba",
    label: "NBA",
    shortLabel: "NBA",
    kind: "matrix-edge",
    kicker: "Statistically significant ref×team split",
    headline: "Evan Scott boosts Minnesota Timberwolves results",
    story: "12-0 across 12 games.",
    heroValue: "+51.5pp",
    heroLabel: "Win rate vs team baseline",
    heroTone: "positive",
    stats: [
      { label: "Ref×team record", value: "12-0" },
      { label: "Games", value: String(games) },
      { label: "Team baseline", value: "48.0%" },
    ],
    links: [],
    entityName: "Evan Scott",
    teamLabel: "Minnesota Timberwolves",
    refSlug: "evan-scott-78",
    teamAbbr: "MIN",
    ...overrides,
  };
}

describe("homepage insight gates", () => {
  it("exports published methodology thresholds", () => {
    assert.equal(REF_TEAM_SPLIT_MIN_GAMES, 8);
    assert.equal(CREW_ANOMALY_MIN_GAMES, 12);
    assert.equal(ATS_OU_CLOSING_LINE_MIN_GAMES, 30);
  });

  it("hides Evan Scott (N=12) and John Grandt (N=9) from homepage cards", () => {
    assert.equal(passesHomepageSampleGate(matrixCard(12)), false);
    assert.equal(
      passesHomepageSampleGate(
        matrixCard(9, {
          entityName: "John Grandt",
          teamLabel: "Colorado Avalanche",
          leagueId: "nhl",
          shortLabel: "NHL",
        }),
      ),
      false,
    );
  });

  it("keeps thicker ref×team splits like Scott Twardoski (N=19)", () => {
    assert.equal(
      passesHomepageSampleGate(
        matrixCard(19, {
          entityName: "Scott Twardoski",
          teamLabel: "New York Knicks",
          heroValue: "+45.2pp",
        }),
      ),
      true,
    );
  });

  it("only labels statistically significant when gate and effect clear", () => {
    const thin = matrixCard(12);
    const robust = matrixCard(19, { heroValue: "+45.2pp" });
    assert.equal(isStatisticallySignificantInsight(thin), false);
    assert.equal(isStatisticallySignificantInsight(robust), true);
    assert.match(homepageInsightKicker(robust), /Statistically significant/);
    assert.match(homepageInsightKicker(thin), /Ref×team split/);
  });

  it("classifies crew anomaly cards separately", () => {
    const crew = matrixCard(10, {
      kicker: "Team×crew anomaly",
      story: "When this crew works Denver games, over rate spikes.",
    });
    assert.equal(homepageInsightCategory(crew), "crew-anomaly");
    assert.equal(passesHomepageSampleGate(crew), false);
  });

  it("exports homepage methodology transparency blurb", () => {
    assert.match(HOMEPAGE_METHODOLOGY_BLURB, /15\+ games/i);
    assert.match(HOMEPAGE_METHODOLOGY_BLURB, /Methodology/i);
  });

  it("filters bundled overview insight pools", () => {
    const cards = [
      matrixCard(19, { entityName: "Scott Twardoski", refSlug: "a" }),
      matrixCard(12, { entityName: "Evan Scott", refSlug: "b" }),
      matrixCard(9, { entityName: "John Grandt", refSlug: "c", leagueId: "nhl", shortLabel: "NHL" }),
    ];
    const filtered = filterHomepageInsightCards(cards);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.entityName, "Scott Twardoski");
  });
});
