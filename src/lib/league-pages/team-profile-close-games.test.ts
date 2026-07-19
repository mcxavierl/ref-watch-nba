import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const HYDRATED_TEAM_PROFILES = [
  ["cbb", "src/lib/league-pages/cbb-team-profile.tsx"],
  ["nhl", "src/lib/league-pages/nhl-team-profile.tsx"],
  ["epl", "src/lib/league-pages/epl-team-profile.tsx"],
  ["laliga", "src/lib/league-pages/laliga-team-profile.tsx"],
  ["cfb", "src/lib/league-pages/cfb-team-profile.tsx"],
] as const;

describe("team profile close-game preload", () => {
  for (const [leagueId, file] of HYDRATED_TEAM_PROFILES) {
    it(`${file} passes league and hydrates game logs`, () => {
      const source = readFileSync(file, "utf8");
      assert.match(source, new RegExp(`league:\\s*"${leagueId}"`));
      assert.match(source, new RegExp(`prepareTeamCrewPage\\("${leagueId}"`));
    });
  }
});
