import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { prioritizeTeamPageCards } from "@/lib/team-page-insights";

function card(
  kind: LeagueInsightCard["kind"],
  heroValue: string,
  refSlug: string,
): LeagueInsightCard {
  return {
    leagueId: "nba",
    label: "NBA",
    shortLabel: "NBA",
    kind,
    kicker: "Test",
    headline: `${refSlug} headline`,
    story: "Story",
    heroValue,
    heroLabel: "Label",
    heroTone: "positive",
    stats: [],
    links: [],
    refSlug,
    teamAbbr: "LAL",
  };
}

describe("prioritizeTeamPageCards", () => {
  it("includes at most one matrix-edge card", () => {
    const result = prioritizeTeamPageCards([
      card("matrix-edge", "+45.0pp", "ref-a"),
      card("matrix-edge", "+30.0pp", "ref-b"),
      card("ref-outlier", "12.5%", "ref-c"),
    ]);

    assert.equal(result.length, 2);
    assert.equal(result.filter((entry) => entry.kind === "matrix-edge").length, 1);
    assert.equal(result[0]?.refSlug, "ref-a");
    assert.equal(result[1]?.refSlug, "ref-c");
  });

  it("prefers ref-outlier and league-pattern before extra matrix cards", () => {
    const result = prioritizeTeamPageCards([
      card("matrix-edge", "+20.0pp", "ref-a"),
      card("matrix-edge", "+18.0pp", "ref-b"),
      card("ref-outlier", "15.0%", "ref-c"),
      card("league-pattern", "0.82", "ref-d"),
    ], 3);

    assert.deepEqual(
      result.map((entry) => entry.kind),
      ["matrix-edge", "ref-outlier", "league-pattern"],
    );
  });

  it("returns fewer cards when the pool is smaller", () => {
    const result = prioritizeTeamPageCards([card("ref-outlier", "10.0%", "ref-a")]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.kind, "ref-outlier");
  });
});
