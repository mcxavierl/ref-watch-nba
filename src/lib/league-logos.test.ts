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
  });

  it("uses square-ish intrinsic dimensions for the EPL lion mark", () => {
    const epl = leagueNavMarkDimensions("epl");
    const nba = leagueNavMarkDimensions("nba");
    assert.ok(epl.height >= epl.width, "EPL lion mark should be portrait or square");
    assert.ok(nba.width > nba.height, "NBA mark remains landscape");
    assert.equal(leagueHeroLogoDimensions("epl").height, 48);
  });
});
