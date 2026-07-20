import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveInsightsLeagueRoute,
  resolveResearchViewRoute,
} from "@/lib/research-route-guards";

describe("research route guards", () => {
  it("resolves insights leagues from manifest", () => {
    assert.equal(resolveInsightsLeagueRoute("nba"), "nba");
    assert.equal(resolveInsightsLeagueRoute("nfl"), "nfl");
    assert.equal(resolveInsightsLeagueRoute("wnba"), null);
    assert.equal(resolveInsightsLeagueRoute("not-a-league"), null);
  });

  it("gates research views by manifest researchViews", () => {
    assert.equal(resolveResearchViewRoute("nfl", "game-state"), "nfl");
    assert.equal(resolveResearchViewRoute("nba", "game-state"), "nba");
    assert.equal(resolveResearchViewRoute("nhl", "game-state"), "nhl");
    assert.equal(resolveResearchViewRoute("epl", "game-state"), null);
    assert.equal(resolveResearchViewRoute("nba", "trends"), "nba");
  });
});
