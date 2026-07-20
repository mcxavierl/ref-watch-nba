import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCommandPaletteIndex } from "./build-search-index";

describe("buildCommandPaletteIndex", () => {
  it("includes refs and teams for live leagues", () => {
    const index = buildCommandPaletteIndex(process.cwd());

    assert.ok(index.refs.length > 500, "expected hundreds of officials");
    assert.ok(index.teams.length > 100, "expected hundreds of teams");
    assert.ok(index.refs.some((ref) => ref.leagueId === "nba"));
    assert.ok(index.teams.some((team) => team.leagueId === "nfl"));

    for (const ref of index.refs.slice(0, 20)) {
      assert.match(ref.href, /^\/[a-z]+\/refs\//);
      assert.ok(ref.name.length > 0);
      assert.ok(ref.games >= 0);
    }

    for (const team of index.teams.slice(0, 20)) {
      assert.match(team.href, /^\/[a-z]+\/teams\//);
      assert.ok(team.abbr.length > 0);
      assert.ok(team.label.length > 0);
    }
  });
});
