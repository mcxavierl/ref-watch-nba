import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { leagueHeroLogoDimensions, leagueLogoSrc, leagueNavMarkDimensions } from "@/lib/league-logo-src";

const LOGO_DIR = join(process.cwd(), "public", "logos");

function readLogo(name: string): string {
  return readFileSync(join(LOGO_DIR, name), "utf8");
}

describe("league logos", () => {
  it("uses official Premier League vector lion, not simplified placeholder icon", () => {
    const onDark = readLogo("epl-lion.svg");
    const onLight = readLogo("epl-lion-dark.svg");

    assert.match(onDark, /Premier League/);
    assert.doesNotMatch(onDark, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(onDark, /M11\.176 0/);
    assert.match(onDark, /fill="#ffffff"/);
    assert.match(onLight, /fill="#3[dD]195[bB]"/);
    assert.ok(onDark.length > 3000, "EPL on-dark logo should use full vector path");
  });

  it("resolves themed EPL logo src for nav and chooser marks", () => {
    assert.equal(leagueLogoSrc("epl", "dark"), "/logos/epl-lion.svg");
    assert.equal(leagueLogoSrc("epl", "light"), "/logos/epl-lion-dark.svg");
    assert.equal(leagueLogoSrc("wnba", "dark"), "/logos/wnba-logo.svg");
    assert.equal(leagueLogoSrc("wnba", "light"), "/logos/wnba-logo-light.svg");
  });

  it("uses square intrinsic dimensions for the EPL lion mark", () => {
    const onDark = readLogo("epl-lion.svg");
    assert.match(onDark, /width="92" height="91"/);

    const epl = leagueNavMarkDimensions("epl");
    const nba = leagueNavMarkDimensions("nba");
    assert.equal(epl.width, epl.height, "EPL lion mark should use a square intrinsic box");
    assert.ok(nba.width > nba.height, "NBA mark remains landscape");
    assert.equal(leagueHeroLogoDimensions("epl").width, leagueHeroLogoDimensions("epl").height);
  });
});
