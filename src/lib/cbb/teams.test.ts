import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CBB_CONFERENCE_DISPLAY_ORDER,
  CBB_TEAMS,
  cbbTeamConferenceByAbbr,
  cbbTeamsInDisplayOrder,
  teamFullName,
} from "@/lib/cbb/teams";

describe("cbb teams ordering", () => {
  it("orders matrix columns by conference display order then school name", () => {
    const ordered = cbbTeamsInDisplayOrder();
    assert.equal(ordered.length, CBB_TEAMS.length);

    const firstAcc = ordered.findIndex((team) => team.conference === "ACC");
    const lastAcc = ordered.findLastIndex((team) => team.conference === "ACC");
    const firstBigTen = ordered.findIndex((team) => team.conference === "Big Ten");
    assert.ok(firstAcc >= 0);
    assert.ok(firstBigTen > lastAcc, "ACC block should precede Big Ten");

    const accTeams = ordered.filter((team) => team.conference === "ACC");
    const accLabels = accTeams.map((team) => teamFullName(team));
    assert.deepEqual(accLabels, [...accLabels].sort((a, b) => a.localeCompare(b)));

    let lastConferenceIndex = -1;
    for (const team of ordered) {
      const index = CBB_CONFERENCE_DISPLAY_ORDER.indexOf(
        team.conference as (typeof CBB_CONFERENCE_DISPLAY_ORDER)[number],
      );
      assert.ok(index >= lastConferenceIndex, `${team.abbr} should follow conference order`);
      lastConferenceIndex = index;
    }
  });

  it("maps every team abbr to its conference for matrix column controls", () => {
    const map = cbbTeamConferenceByAbbr();
    for (const team of CBB_TEAMS) {
      assert.equal(map[team.abbr], team.conference);
    }
  });
});
