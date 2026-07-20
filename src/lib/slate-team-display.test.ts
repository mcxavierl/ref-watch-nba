import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSlateDateLabel,
  formatSlateDateTimeLabel,
  formatSlateStartTime,
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

  it("resolves WNBA city names to canonical abbreviations and logos", () => {
    const vegas = resolveSlateTeam("wnba", "Las Vegas");
    assert.equal(vegas.abbr, "LVA");
    assert.match(vegas.logoUrl ?? "", /\/lv\.png$/);

    const toronto = resolveSlateTeam("wnba", "Toronto");
    assert.equal(toronto.abbr, "TOR");
    assert.match(toronto.logoUrl ?? "", /\/tor\.png$/);

    const goldenState = resolveSlateTeam("wnba", "Golden State");
    assert.equal(goldenState.abbr, "GSV");
    assert.match(goldenState.logoUrl ?? "", /\/gs\.png$/);
  });

  it("attaches logo URLs for major league teams", () => {
    assert.match(resolveSlateTeam("nfl", "LV").logoUrl ?? "", /\/LV$/);
    assert.match(resolveSlateTeam("epl", "CHE").logoUrl ?? "", /\/363\.png$/);
    assert.match(resolveSlateTeam("laliga", "ALA").logoUrl ?? "", /\/96\.png$/);
    assert.match(resolveSlateTeam("nba", "NYK").logoUrl ?? "", /1610612752/);
  });

  it("formats slate dates consistently", () => {
    assert.equal(formatSlateDateLabel("2026-07-18"), "JUL 18");
    assert.equal(formatSlateDateLabel(undefined), null);
    assert.equal(
      formatSlateDateTimeLabel("2026-07-18", "2026-07-18T23:00:00.000Z"),
      "JUL 18 · 7:00 PM",
    );
  });
});
