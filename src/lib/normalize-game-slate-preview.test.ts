import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { normalizeGameSlatePreview } from "@/lib/normalize-game-slate-preview";

const basePreview: GameSlatePreviewPayload = {
  gameId: "game-1",
  leagueId: "nba",
  leagueLabel: "NBA",
  sport: "nba",
  basePath: "/nba",
  matchup: "BOS @ LAL",
  awayTeam: "BOS",
  homeTeam: "LAL",
  awayAbbr: "BOS",
  homeAbbr: "LAL",
  ouLean: "neutral",
  insufficientSample: false,
  sampleGames: 12,
  scoringLabel: "Points",
  whistleLabel: "Fouls",
  avgTotalPoints: 220,
  totalPointsDelta: 2,
  overRate: 0.55,
  avgFouls: 42,
  foulsDelta: 1.2,
  crew: [{ name: "Scott Foster", number: 48, slug: "scott-foster-48" }],
  refTeamRows: [],
  teamImpacts: [],
  storylines: [],
};

describe("normalizeGameSlatePreview", () => {
  it("returns null when game id or league is missing", () => {
    assert.equal(normalizeGameSlatePreview(null), null);
    assert.equal(
      normalizeGameSlatePreview({ ...basePreview, gameId: "" }),
      null,
    );
  });

  it("fills missing arrays and numeric fields for partial snapshot payloads", () => {
    const partial = {
      ...basePreview,
      crew: undefined,
      refTeamRows: undefined,
      teamImpacts: undefined,
      storylines: undefined,
      avgFouls: undefined,
      foulsDelta: undefined,
    } as unknown as GameSlatePreviewPayload;

    const normalized = normalizeGameSlatePreview(partial);
    assert.ok(normalized);
    assert.deepEqual(normalized.crew, []);
    assert.deepEqual(normalized.refTeamRows, []);
    assert.deepEqual(normalized.teamImpacts, []);
    assert.deepEqual(normalized.storylines, []);
    assert.equal(normalized.avgFouls, 0);
    assert.equal(normalized.foulsDelta, 0);
  });

  it("drops crew members without slugs", () => {
    const normalized = normalizeGameSlatePreview({
      ...basePreview,
      crew: [
        { name: "Scott Foster", number: 48, slug: "scott-foster-48" },
        { name: "Broken", number: 1, slug: "" },
      ],
    });
    assert.equal(normalized?.crew.length, 1);
  });
});
