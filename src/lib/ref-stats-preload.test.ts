import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFindings } from "@/lib/nfl/findings";
import {
  leaguesForPath,
  pathNeedsGameLogs,
  pathNeedsTeamSplits,
} from "@/lib/ref-stats-preload";

test("pathNeedsGameLogs defers to per-page scoped hydration (Worker 1102 guard)", () => {
  assert.equal(pathNeedsGameLogs("/"), false);
  assert.equal(pathNeedsGameLogs("/nfl"), false);
  assert.equal(pathNeedsGameLogs("/matrix"), false);
  assert.equal(pathNeedsGameLogs("/teams/BOS"), false);
  assert.equal(pathNeedsGameLogs("/nfl/matrix"), false);
  assert.equal(pathNeedsGameLogs("/nfl/teams/NE"), false);
  assert.equal(pathNeedsGameLogs("/nfl/teams/KC"), false);
  assert.equal(pathNeedsGameLogs("/nfl/refs"), false);
  assert.equal(pathNeedsGameLogs("/nfl/rankings"), false);
});

test("pathNeedsTeamSplits skips ref hubs and static pages", () => {
  assert.equal(pathNeedsTeamSplits("/overview"), false);
  assert.equal(pathNeedsTeamSplits("/methodology"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs/scott-blank"), false);
  assert.equal(pathNeedsTeamSplits("/"), false);
  assert.equal(pathNeedsTeamSplits("/nba"), false);
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
  assert.deepEqual(leaguesForPath("/"), []);
  assert.deepEqual(leaguesForPath("/overview"), []);
  assert.deepEqual(leaguesForPath("/nba"), ["nba"]);
  assert.deepEqual(leaguesForPath("/nfl"), ["nfl"]);
  assert.deepEqual(leaguesForPath("/laliga/insights"), ["laliga"]);
  assert.deepEqual(leaguesForPath("/research"), ["nba"]);
  assert.deepEqual(leaguesForPath(""), []);
  assert.deepEqual(leaguesForPath("/not-a-route"), ["nba"]);
});

test("computeFindings returns empty when scoped stats have no refs", () => {
  assert.deepEqual(computeFindings(6, ["2099-00"]), []);
});
