import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNbaPlayByPlayTimeline } from "./parse-basketball-timeline";

describe("parseNbaPlayByPlayTimeline", () => {
  it("extracts scoring plays and crew stoppages from NBA play-by-play rows", () => {
    const timeline = parseNbaPlayByPlayTimeline(
      [
        {
          PERIOD: 1,
          PCTIMESTRING: "11:30",
          SCORE: "2 - 0",
          SCOREMARGIN: "2",
          HOMEDESCRIPTION: "James 2PT",
          VISITORDESCRIPTION: null,
          NEUTRALDESCRIPTION: null,
          EVENTMSGTYPE: 2,
          EVENTMSGACTIONTYPE: 1,
          PLAYER1_TEAM_ABBREVIATION: "LAL",
        },
        {
          PERIOD: 1,
          PCTIMESTRING: "11:00",
          SCORE: "2 - 0",
          SCOREMARGIN: "2",
          HOMEDESCRIPTION: null,
          VISITORDESCRIPTION: "Brown S.FOUL",
          NEUTRALDESCRIPTION: null,
          EVENTMSGTYPE: 6,
          EVENTMSGACTIONTYPE: 2,
          PLAYER1_TEAM_ABBREVIATION: "BOS",
        },
      ],
      "LAL",
      "BOS",
    );

    assert.equal(timeline.scoringPlays.length, 1);
    assert.equal(timeline.scoringPlays[0]?.points, 2);
    assert.equal(timeline.crewStoppages[0]?.kind, "subjective-foul");
  });
});
