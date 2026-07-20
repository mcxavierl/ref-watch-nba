import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSlateDateLabel,
  resolveSlateTeam,
  slateTeamLogoSport,
} from "@/lib/slate-team-display";

describe("slate-team-display", () => {
  it("resolves NBA teams and maps logo sport", () => {
    assert.equal(slateTeamLogoSport("nba"), "nba");
    assert.equal(slateTeamLogoSport("wnba"), "wnba");
    const team = resolveSlateTeam("nba", "LAL");
    assert.equal(team.abbr, "LAL");
  });

  it("normalizes WNBA ESPN abbreviations", () => {
    const team = resolveSlateTeam("wnba", "LV");
    assert.equal(team.abbr, "LVA");
    assert.match(team.logoUrl ?? "", /\/lv\.png$/);
  });

  it("formats slate dates consistently", () => {
    assert.equal(formatSlateDateLabel("2026-07-18"), "Jul 18");
    assert.equal(formatSlateDateLabel(undefined), null);
  });
});
