import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGameSlatePreview,
  buildRefTeamOutlierNotes,
  refVsTeamsSectionLabel,
  selectGameSlatePreviewCardInsights,
} from "@/lib/game-slate-preview";
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

  it("uses Ref vs teams when the crew has one official", () => {
    assert.equal(refVsTeamsSectionLabel(1), "Ref vs teams");
    assert.equal(refVsTeamsSectionLabel(2), "Crew vs teams");
    assert.equal(refVsTeamsSectionLabel(3), "Crew vs teams");
  });

  it("builds outlier notes from ref-team rows", () => {
    const notes = buildRefTeamOutlierNotes([
      {
        refSlug: "angelica-suffren",
        refName: "Angelica Suffren",
        refNumber: 1,
        teamAbbr: "LVA",
        teamLabel: "Las Vegas Aces",
        games: 8,
        record: "5-3",
        winRate: 0.63,
        avgTotal: 170,
        overRate: 0.375,
        foulsDelta: -1.5,
        isOutlier: true,
        outlierNote:
          "63% win rate with LVA · -1.5 fouls on LVA per game · 37.5% over rate with LVA",
      },
      {
        refSlug: "other-ref",
        refName: "Other Ref",
        refNumber: 2,
        teamAbbr: "CON",
        teamLabel: "Connecticut Sun",
        games: 6,
        record: "3-3",
        winRate: 0.5,
        avgTotal: 165,
        overRate: 0.5,
        foulsDelta: 0.2,
        isOutlier: false,
      },
    ]);

    assert.equal(notes.length, 1);
    assert.match(notes[0] ?? "", /Angelica Suffren · LVA:/);
    assert.match(notes[0] ?? "", /63% win rate with LVA/);
  });

  it("selects the strongest preview insights for upcoming cards", () => {
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
