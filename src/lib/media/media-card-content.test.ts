import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildKeyStatHeadline,
  buildMediaCardContent,
  topEvidenceBullets,
} from "@/lib/media/media-card-content";
import { buildOnAirCopy } from "@/lib/media/on-air-copy";

function previewFixture(
  overrides: Partial<GameSlatePreviewPayload> = {},
): GameSlatePreviewPayload {
  return {
    gameId: "game-1",
    leagueId: "nba",
    leagueLabel: "NBA",
    sport: "nba",
    basePath: "/nba",
    matchup: "LAL @ BOS",
    awayTeam: "Los Angeles Lakers",
    homeTeam: "Boston Celtics",
    awayAbbr: "LAL",
    homeAbbr: "BOS",
    ouLean: "over",
    insufficientSample: false,
    sampleGames: 220,
    scoringLabel: "Points",
    whistleLabel: "Fouls",
    avgTotalPoints: 228,
    totalPointsDelta: 4.2,
    overRate: 0.56,
    avgFouls: 43.4,
    foulsDelta: 4.2,
    crew: [{ name: "Scott Foster", number: 48, slug: "scott-foster-48" }],
    refTeamRows: [],
    teamImpacts: [],
    storylines: [],
    ...overrides,
  };
}

describe("media card content", () => {
  it("builds whistle profile key stat above league average", () => {
    const headline = buildKeyStatHeadline(previewFixture());
    assert.match(headline, /\+4\.2 Fouls Above League Avg/);
  });

  it("returns top three evidence bullets for broadcast summary", () => {
    const preview = previewFixture({
      refTeamRows: [
        {
          refSlug: "scott-foster-48",
          refName: "Scott Foster",
          refNumber: 48,
          teamAbbr: "LAL",
          teamLabel: "Los Angeles Lakers",
          games: 12,
          record: "7-5",
          winRate: 0.58,
          avgTotal: 229,
          overRate: 0.6,
          foulsDelta: 2.4,
          isOutlier: true,
          outlierNote: "High foul rate in recent meetings.",
        },
      ],
    });
    const evidence = buildProjectionEvidence(preview);
    const bullets = topEvidenceBullets(evidence, 3);
    assert.ok(bullets.length <= 3);
    assert.ok(bullets.length > 0);
    assert.match(bullets[0]!, /crew|foul|league/i);
  });

  it("builds combined media card content for both broadcast panels", () => {
    const preview = previewFixture();
    const evidence = buildProjectionEvidence(preview);
    const content = buildMediaCardContent(preview, evidence);

    assert.equal(content.whistleProfile.officialName, "Scott Foster");
    assert.equal(content.whistleProfile.matchup, "LAL @ BOS");
    assert.ok(content.evidenceSummary.bullets.length > 0);
    assert.equal(content.evidenceSummary.metricLabel, "Fouls");
  });
});

describe("on-air copy", () => {
  it("formats teleprompter copy with whistle profile and evidence sections", () => {
    const preview = previewFixture();
    const evidence = buildProjectionEvidence(preview);
    const copy = buildOnAirCopy(preview, evidence);

    assert.match(copy, /REF WATCH \| BROADCAST EXPORT/);
    assert.match(copy, /THE WHISTLE PROFILE/);
    assert.match(copy, /EVIDENCE SUMMARY/);
    assert.match(copy, /Official: Scott Foster/);
    assert.match(copy, /• /);
    assert.match(copy, /Not betting advice/);
  });
});
