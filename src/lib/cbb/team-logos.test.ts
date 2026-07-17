import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CBB_ESPN_TEAM_IDS } from "@/lib/cbb/team-ids";
import { CBB_TEAMS, teamLogoUrl } from "@/lib/cbb/teams";

describe("cbb team logos", () => {
  it("maps every tracked program to an ESPN logo URL", () => {
    for (const team of CBB_TEAMS) {
      const url = teamLogoUrl(team.abbr);
      assert.match(url, /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/ncaa\/500\/\d+\.png$/);
      assert.equal(CBB_ESPN_TEAM_IDS[team.abbr], url.match(/\/(\d+)\.png$/)?.[1]);
    }
  });

  it("TeamLogo resolves CBB sport logos", () => {
    const source = readFileSync("src/components/TeamLogo.tsx", "utf8");
    assert.match(source, /cbbTeamLogoUrl\(team\.abbr\)/);
  });

  it("matrix logo plates use theme-aware surfaces for college marks", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    assert.match(css, /ref-matrix-logo-row \.team-logo-plate[\s\S]*var\(--logo-plate-matrix\)/);
    assert.match(css, /data-sport="cbb"/);
  });
});
