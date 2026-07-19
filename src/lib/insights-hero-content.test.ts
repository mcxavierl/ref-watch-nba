import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findingsToRankingsInsights,
  filterSynthesisForTrends,
  heroSynthesisForView,
  rankingsConfigForView,
  refSlugsFromFindings,
} from "@/lib/insights-hero-content";
import type { Finding } from "@/lib/findings-shared";
import { LEAGUES } from "@/lib/leagues";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-1",
    category: "ref-outlier",
    headline: "Heavy whistle outlier",
    summary: "Flags run above league average in this sample.",
    stats: [{ label: "Flags delta", value: "+2.4" }],
    sampleNote: "120 games",
    links: [{ label: "Test Ref", href: "/nfl/refs/test-ref" }],
    ...overrides,
  };
}

describe("insights-hero-content", () => {
  it("extracts ref slugs from finding profile links", () => {
    const slugs = refSlugsFromFindings([
      makeFinding(),
      makeFinding({
        id: "finding-2",
        links: [{ label: "Other", href: "/nfl/refs/other-ref" }],
      }),
    ]);
    assert.deepEqual(slugs.sort(), ["other-ref", "test-ref"]);
  });

  it("maps findings into highlight card insights", () => {
    const insights = findingsToRankingsInsights([makeFinding()], 6);
    assert.equal(insights.length, 1);
    assert.equal(insights[0]?.refSlug, "test-ref");
    assert.equal(insights[0]?.statValue, "+2.4");
  });

  it("filters synthesis insights for trends view", () => {
    const synthesis: RankingsSynthesis = {
      headline: "Top highlights",
      subhead: "",
      leagueSummary: "",
      qualifiedCount: 10,
      thinSampleCount: 0,
      insights: [
        { id: "top-scoring", title: "Scoring", body: "Body" },
        { id: "top-ats", title: "ATS", body: "Body" },
      ],
    };
    const filtered = filterSynthesisForTrends(synthesis);
    assert.equal(filtered.insights.length, 1);
    assert.equal(filtered.insights[0]?.id, "top-scoring");
  });

  it("returns tab-specific rankings config", () => {
    const synthesis: RankingsSynthesis = {
      headline: "Top highlights",
      subhead: "",
      leagueSummary: "",
      qualifiedCount: 10,
      thinSampleCount: 0,
      insights: [],
    };
    assert.equal(
      rankingsConfigForView("trends", {
        refs: [],
        synthesis,
        findings: [],
      }).defaultSort,
      "overRate-desc",
    );
    const findingsConfig = rankingsConfigForView("findings", {
      refs: [],
      synthesis,
      findings: [makeFinding()],
    });
    assert.ok(findingsConfig.filterSlugs?.has("test-ref"));
  });

  it("links Game-State Index hero cards to the research table, not ref profiles", () => {
    const ref: RefProfile = {
      slug: "sample-ref",
      name: "Sample Ref",
      number: 12,
      games: 150,
      avgTotalPoints: 44,
      overRate: 0.5,
      avgFouls: 12,
      homeCoverRate: null,
      totalPointsDelta: 0,
      foulsDelta: 0,
      referee_gsni: 1.8,
      gsniHighLeverageMinutes: 80,
      gsniSampleGames: 150,
      seasons: ["2024-25"],
      recentGames: [],
    };
    const stats: RefStatsFile = {
      refs: [ref],
      teamSplits: {},
      meta: {
        seasons: ["2024-25"],
        minSampleSize: 50,
        leagueOverBaseline: 45,
        leagueAvgTotal: 44,
        leagueAvgFouls: 12,
        lastUpdated: "2026-01-01",
        source: "espn",
        atsAvailable: false,
      },
    };
    const synthesis = heroSynthesisForView("game-state", stats, LEAGUES.nfl, []);
    assert.equal(synthesis.insights.length, 1);
    assert.equal(synthesis.insights[0]?.id, "gsni-highlight-sample-ref");
    assert.equal(
      synthesis.insights[0]?.categoryHref,
      "/nfl/research/game-state#gsni-row-sample-ref",
    );
    assert.equal(synthesis.insights[0]?.refSlug, "sample-ref");
  });
});
