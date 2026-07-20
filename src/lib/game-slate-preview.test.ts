import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGameSlatePreview } from "@/lib/game-slate-preview";
import { getAssignments as getWnbaAssignments } from "@/lib/wnba/data";
import { getOdds as getWnbaOdds } from "@/lib/wnba/odds";

describe("game slate preview", () => {
  it("builds a preview payload for an assigned slate game", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    assert.ok(game, "expected at least one WNBA game with a crew");

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.equal(preview.gameId, game.id);
    assert.ok(preview.crew.length >= 2);
    assert.ok(preview.scoringLabel.length > 0);
  });

  it("returns null when the crew has not been assigned yet", () => {
    const preview = buildGameSlatePreview(
      "wnba",
      {
        id: "wnba-unassigned",
        matchup: "LVA @ TOR",
        awayTeam: "LVA",
        homeTeam: "TOR",
        league: "WNBA",
        crew: [],
      },
      getWnbaOdds(),
    );
    assert.equal(preview, null);
  });

  it("includes ref-team rows when crew has team history", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    assert.ok(game);

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.ok(Array.isArray(preview.refTeamRows));
    assert.ok(Array.isArray(preview.teamImpacts));
  });

  it("groups team impacts by matchup side", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    assert.ok(game);

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    if (preview.teamImpacts.length > 0) {
      const impact = preview.teamImpacts[0];
      assert.ok(impact.teamAbbr);
      assert.ok(impact.teamLabel);
      assert.ok(Array.isArray(impact.insights));
    }
  });
});
