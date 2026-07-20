import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Insight team logos on editorial cards", () => {
  it("InsightTeamMark resolves slate teams and renders TeamLogo", () => {
    const source = readFileSync("src/components/shared/InsightTeamMark.tsx", "utf8");
    assert.match(source, /resolveSlateTeam/);
    assert.match(source, /slateTeamLogoSport/);
    assert.match(source, /TeamLogo/);
  });

  it("Editorial insight cards show team mark when teamAbbr is present", () => {
    const source = readFileSync("src/components/shared/InsightCard.tsx", "utf8");
    assert.match(source, /InsightTeamMark/);
    assert.match(source, /card\.teamAbbr/);
  });

  it("insight-card styles define team mark plate for light and dark", () => {
    const css = readFileSync("src/components/insight-card.css", "utf8");
    assert.match(css, /\.insight-team-mark/);
    assert.match(css, /data-color="light"/);
    assert.match(css, /insight-accent/);
  });
});
