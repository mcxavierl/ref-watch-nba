import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("prepareTeamsIndexPage", () => {
  it("teams route preloads splits and game logs before rendering", () => {
    const route = readFileSync("src/app/[league]/teams/page.tsx", "utf8");
    assert.match(route, /prepareTeamsIndexPage/);
    assert.match(route, /await prepareTeamsIndexPage\(league\)/);
  });

  it("helper loads team splits and game logs for every league hub", () => {
    const helper = readFileSync(
      "src/lib/league-pages/prepare-teams-index-page.ts",
      "utf8",
    );
    assert.match(helper, /includeTeamSplits: true/);
    assert.match(helper, /preloadGameLogsFromAssets/);
    for (const league of ["nba", "nhl", "nfl", "epl", "laliga", "cbb", "cfb", "wnba"]) {
      assert.match(helper, new RegExp(`${league}:`));
    }
  });
});
