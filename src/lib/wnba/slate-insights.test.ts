import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWnbaSlateInsights } from "@/lib/wnba/slate-insights";
import type { AssignmentsFile } from "@/lib/types";

describe("wnba slate insights", () => {
  it("builds assignment-driven insights with pending crew copy", () => {
    const assignments: AssignmentsFile = {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      date: "2026-07-21",
      source: "espn",
      games: [
        {
          id: "401857083",
          matchup: "LVA @ TOR",
          awayTeam: "LVA",
          homeTeam: "TOR",
          league: "WNBA",
          slateDate: "2026-07-21",
          crew: [],
        },
      ],
    };

    const insights = buildWnbaSlateInsights(assignments, "/wnba");

    assert.equal(insights.pulse.length, 1);
    assert.match(insights.pulse[0]?.body ?? "", /WNBA sample averages/);
    assert.equal(insights.matchups.length, 1);
    assert.match(insights.matchups[0]?.body ?? "", /Refs not assigned yet/);
    assert.equal(insights.spotlights.length, 1);
    assert.match(insights.spotlights[0]?.body ?? "", /referees not assigned yet/i);
  });
});
