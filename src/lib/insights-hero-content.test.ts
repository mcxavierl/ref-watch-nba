import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findingsToRankingsInsights,
  filterSynthesisForTrends,
  rankingsConfigForView,
  refSlugsFromFindings,
} from "@/lib/insights-hero-content";
import type { Finding } from "@/lib/findings-shared";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";

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
});
