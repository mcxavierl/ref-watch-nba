import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildBroadcastEvidenceBullets,
  buildHeroMetric,
  buildMediaCardContent,
  buildRefMediaCardContent,
  formatMatchupBadge,
  topEvidenceBullets,
} from "@/lib/media/media-card-content";
import { buildOnAirCopy } from "@/lib/media/on-air-copy";
import { getRefBySlug, getRefStats } from "@/lib/data";

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
  it("builds hero metric above league average in broadcast uppercase", () => {
    const hero = buildHeroMetric(previewFixture());
    assert.match(hero.headline, /\+4\.2 FOULS ABOVE LEAGUE AVG/);
    assert.equal(hero.tone, "positive");
  });

  it("formats matchup badge from team abbreviations", () => {
    assert.equal(formatMatchupBadge(previewFixture()), "LAL @ BOS");
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
    const bullets = buildBroadcastEvidenceBullets(preview, evidence, 3);
    assert.ok(bullets.length <= 3);
    assert.ok(bullets.length > 0);
    assert.match(bullets[0]!, /crew|foul|league/i);
  });

  it("builds combined media card content for broadcast graphic", () => {
    const preview = previewFixture();
    const evidence = buildProjectionEvidence(preview);
    const content = buildMediaCardContent(preview, evidence);

    assert.equal(content.primaryRef.name, "Scott Foster");
    assert.equal(content.matchupBadge, "LAL @ BOS");
    assert.ok(content.evidenceBullets.length > 0);
    assert.equal(content.metricLabel, "Fouls");
    assert.ok(content.archetypeTag.length > 0);
  });

  it("builds ref profile media card content", () => {
    const profile = getRefBySlug("scott-foster-48");
    assert.ok(profile);
    const stats = getRefStats();
    const content = buildRefMediaCardContent("nba", profile, stats, true);
    assert.equal(content.primaryRef.name, profile.name);
    assert.ok(content.heroMetric.length > 0);
    assert.ok(content.evidenceBullets.length > 0);
  });

  it("keeps legacy topEvidenceBullets export", () => {
    const evidence = buildProjectionEvidence(previewFixture());
    const bullets = topEvidenceBullets(evidence, 3);
    assert.ok(bullets.length > 0);
  });
});

describe("on-air copy", () => {
  it("formats teleprompter copy with on-air storyline", () => {
    const preview = previewFixture();
    const evidence = buildProjectionEvidence(preview);
    const copy = buildOnAirCopy(preview, evidence);

    assert.match(copy, /ON-AIR STORYLINE:/);
    assert.match(copy, /Scott Foster/);
    assert.match(copy, /EVIDENCE SUMMARY/);
    assert.match(copy, /• /);
    assert.match(copy, /Not betting advice/);
  });
});
