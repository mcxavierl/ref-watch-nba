import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyStarPlayer,
  computeStarDeferenceIndex,
  estimatedUsageRateFromRank,
  formatStarDeferenceDisplay,
  resolvePlayerUsageRate,
} from "@/lib/analytics/star-deference-index";
import type { StarPlayerProfile } from "@/lib/personnel-profiles";

function star(overrides: Partial<StarPlayerProfile> = {}): StarPlayerProfile {
  return {
    playerId: "curryst01",
    name: "Stephen Curry",
    team: "GSW",
    season: "2024-25",
    usageRank: 1,
    seasonAvgFoulsDrawn: 3.2,
    starTierPercentile: 99,
    ...overrides,
  };
}

describe("star player classification", () => {
  it("flags high usage and all-star tier players as stars", () => {
    assert.equal(classifyStarPlayer(star()), "star");
    assert.equal(
      classifyStarPlayer(star({ usageRank: 7, allStar: true })),
      "star",
    );
    assert.equal(
      classifyStarPlayer(star({ usageRank: 6, usageRate: 0.29 })),
      "star",
    );
    assert.equal(
      classifyStarPlayer(
        star({ usageRank: 8, usageRate: 0.22, starTierPercentile: 70 }),
      ),
      "rotation",
    );
  });

  it("estimates usage from rank when rate is missing", () => {
    assert.ok(resolvePlayerUsageRate(star({ usageRank: 1 })) >= 0.28);
    assert.ok(estimatedUsageRateFromRank(4) >= 0.28);
    assert.ok(estimatedUsageRateFromRank(10) < 0.28);
  });
});

describe("computeStarDeferenceIndex", () => {
  it("returns positive deference when stars draw more fouls under the official", () => {
    const stars = [
      star({ playerId: "a", team: "GSW" }),
      star({ playerId: "b", team: "LAL", name: "LeBron James" }),
    ];

    const baselineGames = Array.from({ length: 6 }, (_, index) => ({
      gameId: `base-${index}`,
      date: "2024-11-01",
      season: "2024-25",
      homeTeam: "GSW",
      awayTeam: "LAL",
      totalFouls: 40,
      homeFouls: 20,
      awayFouls: 20,
      officials: [{ name: "Other Ref", number: 1 }],
    }));

    const refGames = Array.from({ length: 6 }, (_, index) => ({
      gameId: `ref-${index}`,
      date: "2024-12-01",
      season: "2024-25",
      homeTeam: "GSW",
      awayTeam: "LAL",
      totalFouls: 52,
      homeFouls: 26,
      awayFouls: 26,
      officials: [{ name: "Scott Foster", number: 48 }],
    }));

    const result = computeStarDeferenceIndex(
      "nba",
      "scott-foster-48",
      [...baselineGames, ...refGames],
      stars,
    );

    assert.equal(result.data_quality, "ok");
    assert.ok((result.star_deference_index ?? 0) > 0);
    assert.match(result.star_deference_display ?? "", /\+.*FT\/G to Stars/);
  });

  it("returns insufficient data with too few observations", () => {
    const result = computeStarDeferenceIndex(
      "nba",
      "scott-foster-48",
      [],
      [star()],
    );
    assert.equal(result.data_quality, "insufficient");
    assert.equal(result.star_deference_index, null);
  });

  it("formats display labels by league", () => {
    assert.equal(formatStarDeferenceDisplay(1.8, "nba"), "+1.8 FT/G to Stars");
    assert.equal(formatStarDeferenceDisplay(-0.5, "nfl"), "-0.5 flags/G from Stars");
  });
});
