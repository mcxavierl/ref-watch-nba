import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { CBB_ESPN_TEAM_IDS } from "@/lib/cbb/team-ids";
import { CBB_TEAMS, teamLogoUrl } from "@/lib/cbb/teams";
import { LIVE_NCAA_CONFERENCES } from "@/lib/ncaa-conference-gate";

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

  it("ships conference coverage snapshot for live hubs", () => {
    assert.ok(existsSync("data/cbb/conference-coverage.json"));
    assert.ok(existsSync("public/data/cbb/conference-coverage.json"));
    const snapshot = JSON.parse(
      readFileSync("data/cbb/conference-coverage.json", "utf8"),
    ) as { distinctByConference: Record<string, number> };
    for (const conferenceId of LIVE_NCAA_CONFERENCES) {
      assert.ok(
        snapshot.distinctByConference[conferenceId] > 0,
        `${conferenceId} should have verified games`,
      );
    }
  });

  it("CBB teams index shows conference logos for live territories", () => {
    const source = readFileSync("src/lib/league-pages/cbb-teams.tsx", "utf8");
    assert.match(source, /NcaaConferenceLogo/);
    assert.match(source, /isLiveNcaaConference/);
    assert.match(source, /team-index-link/);
  });
});
