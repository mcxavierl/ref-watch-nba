import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { leagueHeroLogoDimensions, leagueLogoSrc, leagueNavMarkDimensions } from "@/lib/league-logo-src";

const LOGO_DIR = join(process.cwd(), "public", "logos");

function readLogo(name: string): string {
  return readFileSync(join(LOGO_DIR, name), "utf8");
}

describe("league logos", () => {
  it("ships every self-hosted league logo asset on disk", () => {
    const localPaths = [
      "/logos/nba-logo.svg",
      "/logos/nba-logo-light.svg",
      "/logos/nfl-shield.svg",
      "/logos/epl-lion.svg",
      "/logos/epl-lion-dark.svg",
      "/logos/laliga-white.png",
      "/logos/laliga-red.png",
      "/logos/wnba-logo.svg",
      "/logos/wnba-logo-light.svg",
      "/assets/logos/ncaa.svg",
    ];

    for (const assetPath of localPaths) {
      const diskPath = join(process.cwd(), "public", assetPath.slice(1));
      assert.ok(existsSync(diskPath), `missing logo asset: ${assetPath}`);
    }
  });

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

  it("uses portrait WNBA player silhouette marks instead of the wide wordmark", () => {
    const onDark = readLogo("wnba-logo.svg");
    const onLight = readLogo("wnba-logo-light.svg");

    assert.match(onDark, /viewBox="6 0 40 88"/);
    assert.match(onDark, /fill="#ffffff"/);
    assert.match(onLight, /fill="#fa4d00"/);
    assert.doesNotMatch(onDark, /H148V47\.8/);
    assert.doesNotMatch(onLight, /H148V47\.8/);

    const wnba = leagueNavMarkDimensions("wnba");
    const nba = leagueNavMarkDimensions("nba");
    assert.ok(wnba.height > wnba.width, "WNBA silhouette mark should be portrait");
    assert.ok(nba.width > nba.height, "NBA mark remains landscape");
    assert.equal(leagueHeroLogoDimensions("wnba").height, 48);
  });

  it("uses portrait intrinsic dimensions for the EPL lion mark", () => {
    const onDark = readLogo("epl-lion.svg");
    assert.match(onDark, /viewBox="-3 -3 78 95"/);
    assert.match(onDark, /width="78" height="95"/);

    const epl = leagueNavMarkDimensions("epl");
    const nba = leagueNavMarkDimensions("nba");
    assert.ok(epl.height > epl.width, "EPL lion mark should be portrait to match the vector viewBox");
    assert.ok(nba.width > nba.height, "NBA mark remains landscape");
    assert.equal(leagueHeroLogoDimensions("epl").width, leagueHeroLogoDimensions("epl").height);
  });
});
