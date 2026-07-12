import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRedirectHiddenLeague } from "@/lib/header-leagues";

test("shouldRedirectHiddenLeague sends unshipped leagues home", () => {
  for (const path of ["/wnba", "/wnba/", "/wnba/rankings", "/mlb", "/mlb/matrix"]) {
    assert.equal(shouldRedirectHiddenLeague(path), true, path);
  }
  for (const path of ["/", "/nba", "/nfl/rankings", "/wnba-news"]) {
    assert.equal(shouldRedirectHiddenLeague(path), false, path);
  }
});
