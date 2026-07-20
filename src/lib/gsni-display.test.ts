import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  explainGsni,
  formatGsni,
  gsniBand,
  gsniBandCompactLabel,
  gsniBandTitle,
  gsniCaption,
  gsniCategoryLabel,
  gsniCorrelationLabel,
  gsniDiagnosticHeader,
  gsniFromRefProfile,
  gsniHighLeverageStatesCopy,
  gsniIndexScoreExplainer,
  gsniInsightSummary,
  gsniMinHighLeverageMinutesForLeague,
  gsniObservedFromRefProfile,
  gsniQualitativeLabel,
  gsniShrinkageFromProfile,
  gsniShortLabel,
  isExtremeGsni,
} from "@/lib/gsni-display";
import { formatGsniScoreValue, GSNI_SCALE_LEGEND } from "@/lib/gsni-ui";
import type { RefProfile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test",
    name: "Test",
    number: 1,
    games: 100,
    avgTotalPoints: 45,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    ...overrides,
  };
}

describe("gsni display", () => {
  it("maps index score bands and captions", () => {
    assert.equal(gsniBand(1.2), "quiet");
    assert.equal(gsniBand(-1.2), "heavy");
    assert.equal(gsniBand(0.2), "neutral");
    assert.equal(gsniBandTitle("quiet"), "Below-Average Frequency");
    assert.match(gsniCaption(1.2), /suppressed/i);
    assert.match(gsniCaption(-1.2), /elevated penalty frequency/i);
    assert.equal(gsniShortLabel(0.2), "Typical Frequency");
    assert.equal(formatGsni(1.23), "Index Score: +1.2");
    assert.equal(isExtremeGsni(1.8), true);
    assert.equal(isExtremeGsni(0.8), false);
  });

  it("maps high-correlation diagnostic pill labels by sign", () => {
    assert.equal(gsniCorrelationLabel(0.2), "Neutral");
    assert.equal(gsniCorrelationLabel(0.9), "Neutral");
    assert.equal(gsniCorrelationLabel(1.0), "Elevated");
    assert.equal(gsniCorrelationLabel(1.8), "Elevated");
    assert.equal(gsniCorrelationLabel(-1.0), "Suppressed");
    assert.equal(gsniCorrelationLabel(-1.8), "Suppressed");
    assert.equal(gsniDiagnosticHeader(1.2), "+1.2: Elevated");
    assert.equal(gsniDiagnosticHeader(0.3), "+0.3: Neutral");
  });

  it("maps category pill labels", () => {
    assert.equal(gsniCategoryLabel(0.2), "Neutral");
    assert.equal(gsniCategoryLabel(0.9), "Suppressed");
    assert.equal(gsniCategoryLabel(-0.9), "Elevated");
    assert.equal(gsniCategoryLabel(1.8), "Suppressed");
    assert.equal(gsniCategoryLabel(-1.8), "Elevated");
    assert.equal(gsniBandCompactLabel(0.9), "Suppressed");
  });

  it("maps qualitative labels by index score thresholds", () => {
    assert.equal(gsniQualitativeLabel(0.2), "Typical Frequency");
    assert.equal(gsniQualitativeLabel(0.9), "Below-Average Frequency");
    assert.equal(gsniQualitativeLabel(-0.9), "Above-Average Frequency");
    assert.equal(gsniQualitativeLabel(1.8), "Well Below-Average Frequency");
    assert.equal(gsniQualitativeLabel(-1.8), "Well Above-Average Frequency");
  });

  it("builds concise insight summaries", () => {
    assert.match(gsniInsightSummary(0.3), /^\+0\.3: Typical penalty frequency/i);
    assert.match(gsniInsightSummary(0.9), /^\+0\.9: Slightly suppressed/i);
    assert.match(gsniInsightSummary(1.8), /^\+1\.8: Significant whistle-suppression/i);
    assert.match(gsniInsightSummary(-0.9), /^-0\.9: Slightly elevated/i);
    assert.match(gsniInsightSummary(-1.5), /^-1\.5: Significantly elevated/i);
    assert.equal(formatGsniScoreValue(0), "0.0");
    assert.match(GSNI_SCALE_LEGEND, /0\.0 = League Avg/);
    assert.match(GSNI_SCALE_LEGEND, /Higher Frequency/);
    assert.match(GSNI_SCALE_LEGEND, /Lower Frequency/);
  });

  it("explains frequency labels in plain language", () => {
    const quiet = explainGsni(1.2);
    assert.equal(quiet.band, "quiet");
    assert.equal(quiet.tendency, "below-average");
    assert.equal(quiet.categoryLabel, "Suppressed");
    assert.match(quiet.insightSummary, /suppressed/i);
    assert.match(quiet.methodLine, /score gap and clock/i);
    assert.equal(quiet.scaleLine, GSNI_SCALE_LEGEND);

    const heavy = explainGsni(-1.2);
    assert.equal(heavy.band, "heavy");
    assert.equal(heavy.tendency, "above-average");
    assert.equal(heavy.categoryLabel, "Elevated");
  });

  it("reads shrunk Game-State Index from ref profiles when present", () => {
    const profile = makeRef({ referee_gsni: 1.2, gsniHighLeverageMinutes: 20 });
    const shrinkage = gsniShrinkageFromProfile(profile);
    assert.ok(shrinkage);
    assert.equal(shrinkage!.observed, 1.2);
    assert.ok(shrinkage!.display < shrinkage!.observed);
    assert.equal(gsniFromRefProfile(profile), shrinkage!.display);
    assert.equal(gsniObservedFromRefProfile(profile), 1.2);
    assert.match(shrinkage!.tooltip, /Index Score/i);
  });

  it("returns null when Game-State Index is missing", () => {
    assert.equal(gsniFromRefProfile(makeRef()), null);
    assert.equal(gsniShrinkageFromProfile(makeRef()), null);
  });

  it("defines high-leverage states and index score copy for research pages", () => {
    assert.equal(gsniMinHighLeverageMinutesForLeague("nfl"), 25);
    assert.equal(gsniMinHighLeverageMinutesForLeague("nba"), 50);
    assert.match(gsniHighLeverageStatesCopy("nfl"), /within 5 points/);
    assert.match(gsniHighLeverageStatesCopy("nfl"), /under 5:00/);
    assert.match(gsniHighLeverageStatesCopy("nfl"), /25\+ high-leverage minutes/);
    assert.match(gsniHighLeverageStatesCopy("nba"), /50\+ high-leverage minutes/);
    assert.match(gsniHighLeverageStatesCopy("nba"), /foul rate/);
    assert.match(gsniIndexScoreExplainer("nfl"), /Index score 0 is league average/);
    assert.match(gsniIndexScoreExplainer("nba"), /more fouls than peers/);
  });

  it("keeps GSNI panel numerics readable in light mode on dark cards", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(css, /\.gsni-card \.gsni-sample-count[\s\S]*--gsni-ink-strong/);
    assert.match(
      css,
      /html\[data-color="light"\][\s\S]*\.gsni-card \.gsni-sample-count[\s\S]*--gsni-ink-strong/,
    );
    assert.match(css, /\.gsni-correlation-pill--suppressed[\s\S]*rgb\(253 164 175\)/);
  });
});
