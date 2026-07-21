import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGameSlatePreview,
  buildRefTeamOutlierNotes,
  selectGameSlatePreviewCardInsights,
} from "@/lib/game-slate-preview";
import { getAssignments as getWnbaAssignments } from "@/lib/wnba/data";
import { getOdds as getWnbaOdds } from "@/lib/wnba/odds";

describe("game slate preview", () => {
  it("builds a preview payload for an assigned slate game", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    if (!game) return;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.equal(preview.gameId, game.id);
    assert.ok(preview.crew.length >= 2);
    assert.ok(preview.scoringLabel.length > 0);
  });

  it("builds a matchup sheet when the crew has not been assigned yet", () => {
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
    assert.ok(preview);
    assert.equal(preview.awaitingCrew, true);
    assert.equal(preview.crew.length, 0);
    assert.ok(preview.matchupBriefing);
    assert.ok(preview.matchupBriefing.lines.length > 0);
  });

  it("includes ref-team rows when crew has team history", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    if (!game) return;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.ok(Array.isArray(preview.refTeamRows));
    assert.ok(Array.isArray(preview.teamImpacts));
  });

  it("groups team impacts by matchup side", () => {
    const assignments = getWnbaAssignments();
    const game = assignments.games.find((entry) => entry.crew.length >= 2);
    if (!game) return;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    if (preview.teamImpacts.length > 0) {
      const impact = preview.teamImpacts[0];
      assert.ok(impact.teamAbbr);
      assert.ok(impact.teamLabel);
      assert.ok(Array.isArray(impact.insights));
    }
  });

  it("groups team impacts by matchup side", () => {
    const preview = buildGameSlatePreview(
      "wnba",
      {
        id: "wnba-preview-insight",
        matchup: "LVA @ CON",
        awayTeam: "LVA",
        homeTeam: "CON",
        league: "WNBA",
        crew: [{ name: "Dee Kantor", number: 10, role: "referee" }],
      },
      getWnbaOdds(),
    );
    assert.ok(preview);

    const insights = selectGameSlatePreviewCardInsights(
      {
        ...preview,
        homeBiasHeadline: "Home teams cover more often with this crew.",
        storylines: [
          {
            headline: "High-scoring crew",
            summary: "This crew has cleared the total in 7 of the last 10 games.",
          },
        ],
      },
      2,
    );

    assert.ok(insights.length >= 1);
    assert.match(insights[0] ?? "", /Home teams cover|High-scoring crew/);
    assert.ok(insights.every((line) => !line.includes("Last met")));
  });
});
