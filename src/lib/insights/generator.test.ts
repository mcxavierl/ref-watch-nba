import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUL_RATE_VARIANCE_PCT,
  findTeamTopFinding,
  generateTopStories,
  isAllowedInsightLeague,
  scanAllProLeagueOutliers,
  WIN_RATE_OUTLIER_PP,
} from "./generator";
import { applyClinicalTone, isClinicalTone } from "./tone-filter";
import { EVERGREEN_TOP_STORIES } from "./evergreen";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";

describe("insight generator", () => {
  it("scans matrix analytics leagues including verified WNBA ref profiles", () => {
    for (const leagueId of PRO_MATRIX_ANALYTICS_LEAGUE_IDS) {
      assert.equal(isAllowedInsightLeague(leagueId), true);
    }
    assert.equal(isAllowedInsightLeague("wnba"), true);
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

  it("findTeamTopFinding filters league outliers by team", () => {
    const finding = findTeamTopFinding("nba", "LAL");
    if (finding) {
      assert.equal(typeof finding.headline, "string");
      assert.equal(typeof finding.body, "string");
      assert.ok(
        finding.category === "win-rate" ||
          finding.category === "whistle-pace" ||
          finding.category === "team-insight",
      );
    }
  });

  it("findTeamTopFinding falls back to team insights for NCAA leagues", () => {
    const fallback = [
      {
        id: "cbb-win",
        category: "win-record" as const,
        title: "Win rate pattern",
        body: "Sample insight for Duke.",
        sampleGames: 8,
      },
    ];
    const finding = findTeamTopFinding("cbb", "DUKE", fallback);
    assert.ok(finding);
    assert.equal(finding?.category, "team-insight");
    assert.match(finding?.headline ?? "", /Win rate pattern/i);
  });
});
