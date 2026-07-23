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
import { getOdds as getNflOdds } from "@/lib/nfl/odds";
import { PENDING_EMPTY_H2H_COPY } from "@/lib/slate-intelligence";

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

  it("uses standardized empty head-to-head copy when no matchup context exists", () => {
    const preview = buildGameSlatePreview(
      "nfl",
      {
        id: "nfl-no-h2h",
        matchup: "ZZX @ ZZY",
        awayTeam: "ZZX",
        homeTeam: "ZZY",
        league: "NFL",
        crew: [],
      },
      getNflOdds(),
    );
    assert.ok(preview);
    assert.equal(preview.awaitingCrew, true);
    assert.ok(preview.matchupBriefing);
    assert.ok(preview.matchupBriefing.lines.includes(PENDING_EMPTY_H2H_COPY));
    assert.ok(
      !preview.matchupBriefing.lines.some((line) =>
        line.includes("no published head-to-head sample yet"),
      ),
    );
  });

  it("includes ref-team rows when crew has team history", () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;

    const preview = buildGameSlatePreview("wnba", game, getWnbaOdds());
    assert.ok(preview);
    assert.ok(Array.isArray(preview.refTeamRows));
    assert.ok(Array.isArray(preview.teamImpacts));
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
