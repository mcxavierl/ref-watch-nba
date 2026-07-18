import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  leagueGameUnit,
  leagueGamesLabel,
  leagueGamesUnit,
  leaguePerGamePhrase,
} from "@/lib/leagues";

describe("league game terminology", () => {
  it("uses games for US sports hubs", () => {
    for (const leagueId of ["nba", "nhl", "nfl", "cbb", "cfb"] as const) {
      assert.equal(leagueGameUnit(leagueId), "game");
      assert.equal(leagueGamesUnit(leagueId), "games");
      assert.equal(leagueGamesLabel(leagueId), "Games");
      assert.equal(leaguePerGamePhrase(leagueId), "per game");
    }
  });

  it("uses matches for soccer hubs", () => {
    for (const leagueId of ["epl", "laliga"] as const) {
      assert.equal(leagueGameUnit(leagueId), "match");
      assert.equal(leagueGamesUnit(leagueId), "matches");
      assert.equal(leagueGamesLabel(leagueId), "Matches");
      assert.equal(leaguePerGamePhrase(leagueId), "per match");
    }
  });
});
