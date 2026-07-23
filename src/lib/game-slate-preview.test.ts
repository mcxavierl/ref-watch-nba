import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGameSlatePreview,
  buildRefTeamOutlierNotes,
  resolveMatchupDrawerBriefing,
  selectGameSlatePreviewCardInsights,
} from "@/lib/game-slate-preview";
import { ASSIGNED_WNBA_GAME_FIXTURE } from "@/lib/wnba/test-fixtures";
import { getOdds as getWnbaOdds } from "@/lib/wnba/odds";

describe("game slate preview", () => {
  it("builds a preview payload for an assigned slate game", () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.equal(preview.gameId, game.id);
    assert.ok(preview.crew.length >= 2);
    assert.ok(preview.scoringLabel.length > 0);
  });

  it("resolves drawer briefing from preview stats when lines are missing", () => {
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

    const briefing = resolveMatchupDrawerBriefing({
      ...preview!,
      matchupBriefing: {
        headline: "LVA at TOR matchup sheet",
        lines: [],
        h2hGames: preview!.sampleGames,
        avgTotalPoints: preview!.avgTotalPoints,
        avgFouls: preview!.avgFouls,
        overRate: preview!.overRate,
      },
    });

    assert.ok(briefing.lines.length > 0);
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

  it("labels the WNBA All-Star game instead of franchise head-to-head history", () => {
    const preview = buildGameSlatePreview(
      "wnba",
      {
        id: "401857320",
        matchup: "SPO @ COOP",
        awayTeam: "SPO",
        homeTeam: "COOP",
        league: "WNBA",
        crew: [],
      },
      getWnbaOdds(),
    );

    assert.ok(preview?.matchupBriefing);
    assert.equal(preview!.matchupBriefing!.headline, "WNBA ALL-STAR GAME");
    assert.match(preview!.matchupBriefing!.lines.join(" "), /All-Star showcase event/i);
    assert.doesNotMatch(
      preview!.matchupBriefing!.lines.join(" "),
      /No recent head-to-head matchups on file/i,
    );
  });

  it("includes ref-team rows when crew has team history", () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.ok(Array.isArray(preview.refTeamRows));
    assert.ok(Array.isArray(preview.teamImpacts));
  });

  it("resolves WNBA ref profiles when assignment numbers are missing", () => {
    const preview = buildGameSlatePreview(
      "wnba",
      {
        id: "401999999",
        matchup: "DAL @ POR",
        awayTeam: "DAL",
        homeTeam: "POR",
        league: "WNBA",
        crew: [
          { name: "Tiara Cruse", number: 0, role: "crew_chief" },
          { name: "Randy Richardson", number: 0, role: "referee" },
          { name: "Toni Patillo", number: 0, role: "umpire" },
        ],
      },
      getWnbaOdds(),
    );

    assert.ok(preview);
    assert.ok((preview.avgFouls ?? 0) > 0);
    assert.ok((preview.refTeamRows ?? []).some((row) => row.teamAbbr === "DAL"));
  });

  it("groups team impacts by matchup side", () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;
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

  it("surfaces crew scoring trends at the central highlight scoring gate", () => {
    const preview = buildGameSlatePreview(
      "wnba",
      {
        id: "wnba-scoring-gate",
        matchup: "LVA @ CON",
        awayTeam: "LVA",
        homeTeam: "CON",
        league: "WNBA",
        crew: [
          { name: "Dee Kantor", number: 10, role: "referee" },
          { name: "Tim Greene", number: 9, role: "crew_chief" },
        ],
      },
      getWnbaOdds(),
    );
    assert.ok(preview);
    if (preview.insufficientSample) return;

    const withSignal = selectGameSlatePreviewCardInsights(
      {
        ...preview,
        totalPointsDelta: 0.6,
        foulsDelta: 0,
      },
      3,
    );
    const withoutSignal = selectGameSlatePreviewCardInsights(
      {
        ...preview,
        totalPointsDelta: 0.3,
        foulsDelta: 0,
      },
      3,
    );

    assert.ok(
      withSignal.some((line) => line.includes("Crew trends")),
      "expected scoring trend at 0.6 delta",
    );
    assert.ok(
      !withoutSignal.some((line) => line.includes("Crew trends")),
      "expected no scoring trend below 0.5 delta gate",
    );
  });
});
