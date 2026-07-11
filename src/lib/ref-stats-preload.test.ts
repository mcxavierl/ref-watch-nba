import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFindings } from "@/lib/nfl/findings";
import {
  leaguesForPath,
  pathNeedsGameLogs,
  pathNeedsTeamSplits,
} from "@/lib/ref-stats-preload";

test("pathNeedsGameLogs is disabled in production Workers", () => {
  assert.equal(pathNeedsGameLogs("/"), false);
  assert.equal(pathNeedsGameLogs("/matrix"), false);
  assert.equal(pathNeedsGameLogs("/nfl"), false);
});

test("pathNeedsTeamSplits skips ref hubs and static pages", () => {
  assert.equal(pathNeedsTeamSplits("/overview"), false);
  assert.equal(pathNeedsTeamSplits("/methodology"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs/scott-blank"), false);
  assert.equal(pathNeedsTeamSplits("/"), false);
  assert.equal(pathNeedsTeamSplits("/nfl"), false);
  assert.equal(pathNeedsTeamSplits("/nhl"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/matrix"), true);
  assert.equal(pathNeedsTeamSplits("/nfl/teams/KC"), true);
});

test("pathNeedsTeamSplits skips insight and research hubs", () => {
  assert.equal(pathNeedsTeamSplits("/insights"), false);
  assert.equal(pathNeedsTeamSplits("/rankings"), false);
  assert.equal(pathNeedsTeamSplits("/trends"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/insights"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/research"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/rankings"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/trends"), false);
  assert.equal(pathNeedsTeamSplits("/laliga/crews"), false);
  assert.equal(pathNeedsTeamSplits("/nba/insights"), false);
});

test("leaguesForPath scopes preload to the active league", () => {
  assert.deepEqual(leaguesForPath("/overview"), []);
  assert.deepEqual(leaguesForPath("/nfl"), ["nfl"]);
  assert.deepEqual(leaguesForPath("/laliga/insights"), ["laliga"]);
  assert.deepEqual(leaguesForPath("/research"), ["nba"]);
  assert.deepEqual(leaguesForPath(""), ["nba"]);
  assert.deepEqual(leaguesForPath("/not-a-route"), ["nba"]);
});

test("computeFindings returns empty when scoped stats have no refs", () => {
  assert.deepEqual(computeFindings(6, ["2099-00"]), []);
});
