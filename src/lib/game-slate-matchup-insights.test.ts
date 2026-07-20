import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGameSlateMatchupInsights,
  refVsTeamsSectionLabel,
} from "@/lib/game-slate-matchup-insights";

describe("game slate matchup insights", () => {
  it("uses Ref vs teams when the crew has one official", () => {
    assert.equal(refVsTeamsSectionLabel(1), "Ref vs teams");
    assert.equal(refVsTeamsSectionLabel(2), "Crew vs teams");
    assert.equal(refVsTeamsSectionLabel(3), "Crew vs teams");
  });

  it("builds insight cards for ref-team outlier dimensions", () => {
    const insights = buildGameSlateMatchupInsights([
      {
        refSlug: "angelica-suffren",
        refName: "Angelica Suffren",
        teamAbbr: "LVA",
        teamLabel: "Las Vegas Aces",
        games: 8,
        record: "5-3",
        winRate: 0.63,
        overRate: 0.375,
        foulsDelta: -1.5,
        isOutlier: true,
      },
    ]);

    assert.equal(insights.length, 3);
    assert.equal(insights[0]?.kind, "win-rate");
    assert.equal(insights[0]?.contextPill, "Win Rate");
    assert.equal(insights[0]?.metric, "63%");
    assert.match(insights[0]?.title ?? "", /Angelica Suffren · LVA/);

    const foulImpact = insights.find((insight) => insight.kind === "foul-impact");
    assert.ok(foulImpact);
    assert.equal(foulImpact.contextPill, "Foul Impact");
    assert.equal(foulImpact.metric, "-1.5");

    const overRate = insights.find((insight) => insight.kind === "over-rate");
    assert.ok(overRate);
    assert.equal(overRate.contextPill, "Over Rate");
    assert.equal(overRate.metric, "37.5%");
  });

  it("skips non-outlier rows", () => {
    const insights = buildGameSlateMatchupInsights([
      {
        refSlug: "other-ref",
        refName: "Other Ref",
        teamAbbr: "CON",
        teamLabel: "Connecticut Sun",
        games: 6,
        record: "3-3",
        winRate: 0.5,
        overRate: 0.5,
        foulsDelta: 0.2,
        isOutlier: false,
      },
    ]);

    assert.equal(insights.length, 0);
  });
});
