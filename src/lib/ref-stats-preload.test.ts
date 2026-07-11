import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
