import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  BANNED_NEGATIVE_DELTA_HEADLINE,
  crewScoringPremiumEdge,
  deltaVsLeagueHeadline,
  formatFindingCardMeta,
  formatFindingSampleMeta,
  formatRefProfileSampleMeta,
  formatSeasonSpan,
  isNeutralRate,
  minorsPaceHeadline,
  overBenchmarkStatLabel,
  overUnderFrequencyHeadline,
  scoringPaceRankTitle,
  thirdPersonScoringPaceBody,
  thirdPersonWhistlePaceBody,
  whistleParadoxHeadline,
  whistlePaceHeadline,
  whistlePaceRankTitle,
} from "@/lib/finding-copy";
import { filterDisplayStats, isSampleOnlyStat } from "@/lib/findings-shared";

describe("finding-copy", () => {
  it("detects neutral over rates between 49% and 51%", () => {
    assert.equal(isNeutralRate(0.49), true);
    assert.equal(isNeutralRate(0.5), true);
    assert.equal(isNeutralRate(0.51), true);
    assert.equal(isNeutralRate(0.48), false);
    assert.equal(isNeutralRate(0.52), false);
  });

  it("formats compressed season spans", () => {
    assert.equal(
      formatSeasonSpan(["2016-17", "2017-18", "2025-26"]),
      "2016–2026",
    );
    assert.equal(
      formatFindingSampleMeta(11979, ["2016-17", "2017-18", "2025-26"]),
      "Sample: 11,979 games over 3 seasons (2016–2026)",
    );
    assert.equal(
      formatRefProfileSampleMeta(414, Array.from({ length: 26 }, (_, i) => `20${String(99 + i).slice(-2)}-${String(i).padStart(2, "0")}`)),
      "414 games analyzed over 26 seasons",
    );
    assert.equal(formatRefProfileSampleMeta(12, []), "12 games analyzed");
  });

  it("uses balanced language for neutral over/under headlines", () => {
    const headline = overUnderFrequencyHeadline("Mitchell Ervin", 0.5, "low");
    assert.match(headline, /benchmark|neutral|standard pacing/i);
    assert.doesNotMatch(headline, /under frequency|over frequency|heavy/i);
  });

  it("notes whistle/scoring divergence when pace is high but outcome is neutral", () => {
    const headline = whistlePaceHeadline("Mitchell Ervin", 1.2, "fouls", 0.5);
    assert.match(headline, /heavy fouls pace/i);
    assert.match(headline, /dead-neutral/i);
  });

  it("uses fewer/below language for negative whistle deltas", () => {
    const headline = whistlePaceHeadline("Ian Walsh", -1.2, "minors", 0.44);
    assert.match(headline, /1\.2 fewer minors/i);
    assert.doesNotMatch(headline, BANNED_NEGATIVE_DELTA_HEADLINE);
  });

  it("minors headline respects negative delta sign", () => {
    const negative = minorsPaceHeadline("Kelly Sutherland", -1.2);
    assert.match(negative, /1\.2 fewer minors than league average/i);
    assert.doesNotMatch(negative, BANNED_NEGATIVE_DELTA_HEADLINE);

    const positive = minorsPaceHeadline("Kelly Sutherland", 1.4);
    assert.match(positive, /1\.4 more minors than league average/i);
  });

  it("deltaVsLeagueHeadline never uses superlatives on negative deltas", () => {
    const headline = deltaVsLeagueHeadline("Scott Foster", -2.3, "fouls");
    assert.match(headline, /fewer fouls/i);
    assert.doesNotMatch(headline, BANNED_NEGATIVE_DELTA_HEADLINE);
  });

  it("third-person ranking copy matches signed whistle delta direction", () => {
    assert.equal(
      thirdPersonWhistlePaceBody(-2, "fouls called"),
      "Runs 2.0 fouls called below average per game.",
    );
    assert.equal(
      thirdPersonWhistlePaceBody(2, "fouls called"),
      "Runs 2.0 fouls called above average per game.",
    );
    assert.equal(
      thirdPersonWhistlePaceBody(2, "fouls called", "per match"),
      "Runs 2.0 fouls called above average per match.",
    );
    assert.equal(whistlePaceRankTitle(-2.6, "Whistle"), "Lightest whistle ref");
    assert.equal(whistlePaceRankTitle(2.6, "Whistle"), "Heaviest whistle ref");
    assert.doesNotMatch(whistlePaceRankTitle(-2.6, "Whistle"), BANNED_NEGATIVE_DELTA_HEADLINE);
    assert.equal(whistlePaceRankTitle(2, "Whistle"), "Notable heavy whistle pace");
    assert.equal(whistlePaceRankTitle(-2, "Whistle"), "Notable light whistle pace");
  });

  it("third-person scoring copy matches signed delta direction", () => {
    assert.equal(
      thirdPersonScoringPaceBody(-1.4, "points"),
      "Averages 1.4 fewer combined points than the league baseline per game.",
    );
    assert.equal(
      thirdPersonScoringPaceBody(-1.4, "points", "per match"),
      "Averages 1.4 fewer combined points than the league baseline per match.",
    );
    assert.equal(scoringPaceRankTitle(-1.4), "Biggest scoring dip");
    assert.equal(scoringPaceRankTitle(1.4), "Biggest scoring bump");
  });

  it("crew scoring premium edge uses above/below language consistently", () => {
    assert.equal(
      crewScoringPremiumEdge(2.1, "pts"),
      "Crew historically adds 2.1 pts above average",
    );
    assert.equal(
      crewScoringPremiumEdge(-2.1, "pts"),
      "Crew historically runs 2.1 pts below average",
    );
  });

  it("overBenchmarkStatLabel matches rate direction", () => {
    assert.equal(overBenchmarkStatLabel(0.52), "Over benchmark");
    assert.equal(overBenchmarkStatLabel(0.48), "Under benchmark");
    assert.equal(overBenchmarkStatLabel(0.5), "At benchmark");
  });

  it("formats compact card metadata with data maturity tier", () => {
    const meta = formatFindingCardMeta(
      "Sample: 65 games over 3 seasons (2023–2026)",
      "Strong",
    );
    assert.equal(meta, "Sample: 65 games • Data maturity: High");
  });

  it("keeps paradox language when scoring is clearly under neutral", () => {
    const headline = whistleParadoxHeadline("Scott Foster", 0.44);
    assert.match(headline, /scores stay low/i);
  });

  it("official-facing copy avoids gendered pronouns", () => {
    for (const rel of [
      "src/lib/finding-copy.ts",
      "src/lib/grudge-match.ts",
      "src/lib/rankings-synthesis.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(source, /\b(He|His|he|his|him)\b/, rel);
    }
  });
});

describe("finding display stats", () => {
  it("filters sample-only third columns from the metrics grid", () => {
    const stats = [
      { label: "Minors per team", value: "6.1", detail: "-1.2 vs 7.3 league avg" },
      { label: "Under benchmark", value: "48%", detail: "5.5 goals" },
      { label: "Sample", value: "65", detail: "Min 30 games" },
    ];
    assert.equal(isSampleOnlyStat(stats[2]!), true);
    assert.equal(filterDisplayStats(stats).length, 2);
  });
});

describe("metric delight tones", () => {
  it("keeps contextual benchmark percentages neutral", async () => {
    const { findingStatDelightTone, isContextualBenchmarkStat } = await import(
      "@/lib/metric-delight"
    );
    const stat = { label: "Under benchmark", value: "36.0%", detail: "65 games" };
    assert.equal(isContextualBenchmarkStat(stat), true);
    assert.equal(findingStatDelightTone(stat), "neutral");
  });

  it("keeps league baseline comparisons neutral", async () => {
    const { findingStatDelightTone, isLeagueBaselineComparisonStat } = await import(
      "@/lib/metric-delight"
    );
    const stat = {
      label: "Whistle delta",
      value: "-3.7",
      detail: "vs 25.2 league avg",
    };
    assert.equal(isLeagueBaselineComparisonStat(stat), true);
    assert.equal(findingStatDelightTone(stat), "neutral");
  });

  it("colors betting-market ATS stats when applicable", async () => {
    const { findingStatDelightTone } = await import("@/lib/metric-delight");
    const stat = {
      label: "O/U ATS",
      value: "58.2%",
      detail: "42 decisive games",
    };
    assert.equal(findingStatDelightTone(stat), "positive");
  });
});
