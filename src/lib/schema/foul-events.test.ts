import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crewIdFromOfficials,
  expandGameToFoulEvents,
  FOUL_EVENTS_INDEXES,
  foulEventRecordSchema,
  indexFoulEventsByCrewId,
} from "@/lib/schema/foul-events";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

function makeGame(): RuntimeGameLogEntry {
  return {
    gameId: "nba-test-1",
    date: "2025-11-01",
    season: "2025-26",
    league: "NBA",
    homeTeam: "LAL",
    awayTeam: "BOS",
    homeScore: 110,
    awayScore: 105,
    totalPoints: 215,
    totalFouls: 42,
    closingTotal: 220,
    homeSpread: -2.5,
    lineSource: "external",
    officials: [
      { name: "Scott Foster", number: 48, role: "crew_chief" },
      { name: "Tony Brothers", number: 25, role: "referee" },
      { name: "Marc Davis", number: 8, role: "umpire" },
    ],
  };
}

describe("foul-events schema", () => {
  it("declares crew_id and official_id as indexed fields", () => {
    assert.deepEqual(FOUL_EVENTS_INDEXES, ["crew_id", "official_id", "game_id"]);
  });

  it("builds stable crew_id values from officials", () => {
    const crewId = crewIdFromOfficials(makeGame().officials);
    assert.match(crewId, /marc-davis-8/);
    assert.match(crewId, /scott-foster-48/);
    assert.match(crewId, /tony-brothers-25/);
    assert.equal(crewId.split("|").length, 3);
  });

  it("expands games into foul_events with official_id and crew_id", () => {
    const events = expandGameToFoulEvents(makeGame(), "nba");
    assert.ok(events.length >= 3);
    for (const event of events) {
      const parsed = foulEventRecordSchema.safeParse(event);
      assert.equal(parsed.success, true, JSON.stringify(parsed));
      assert.equal(event.crew_id, crewIdFromOfficials(makeGame().officials));
      assert.ok(event.official_id.length > 0);
    }
  });

  it("indexes foul_events by crew_id", () => {
    const events = expandGameToFoulEvents(makeGame(), "nba");
    const indexed = indexFoulEventsByCrewId(events);
    assert.equal(indexed.size, 1);
    assert.equal(indexed.get(events[0]!.crew_id)?.length, events.length);
  });
});
