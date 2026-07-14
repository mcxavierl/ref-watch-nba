import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUL_RATE_VARIANCE_PCT,
  generateTopStories,
  isAllowedInsightLeague,
  scanAllProLeagueOutliers,
  WIN_RATE_OUTLIER_PP,
} from "./generator";
import { applyClinicalTone, isClinicalTone } from "./tone-filter";
import { EVERGREEN_TOP_STORIES } from "./evergreen";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";

describe("insight generator", () => {
  it("only scans pro verified live leagues", () => {
    for (const leagueId of PRO_VERIFIED_LIVE_LEAGUE_IDS) {
      assert.equal(isAllowedInsightLeague(leagueId), true);
    }
    assert.equal(isAllowedInsightLeague("cbb"), false);
    assert.equal(isAllowedInsightLeague("cfb"), false);
  });

  it("applies clinical tone filter to sensational copy", () => {
    const raw = "Scott Foster is on a hot streak crushing the baseline!";
    const toned = applyClinicalTone(raw);
    assert.ok(isClinicalTone(toned));
    assert.match(toned, /elevated|baseline|outlier|exceeds/i);
    assert.doesNotMatch(toned, /hot|crushing/i);
  });

  it("returns evergreen fallback when no outliers meet thresholds", () => {
    const emptyCandidates = scanAllProLeagueOutliers().filter(
      (candidate) =>
        candidate.kind === "win-rate"
          ? Math.abs(candidate.matrix?.deltaPts ?? 0) < WIN_RATE_OUTLIER_PP
          : (candidate.whistleVariancePct ?? 0) < FOUL_RATE_VARIANCE_PCT,
    );
    void emptyCandidates;

    const { stories, status } = generateTopStories(3);
    if (stories.length === 0) {
      assert.equal(status, "fallback");
      assert.deepEqual(stories, EVERGREEN_TOP_STORIES.slice(0, 3));
    } else {
      assert.ok(stories.length <= 3);
      for (const story of stories) {
        assert.ok(isAllowedInsightLeague(story.leagueId));
        assert.ok(isClinicalTone(story.headline));
        assert.ok(isClinicalTone(story.story));
      }
    }
  });

  it("produces server-side cards without client-only fields", () => {
    const { stories } = generateTopStories(3);
    assert.ok(stories.length > 0);
    for (const story of stories) {
      assert.equal(typeof story.headline, "string");
      assert.equal(typeof story.heroValue, "string");
      assert.ok(Array.isArray(story.links));
      assert.ok(story.links.length > 0);
    }
  });
});
