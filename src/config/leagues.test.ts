import test from "node:test";
import assert from "node:assert/strict";
import {
  CBB_LEAGUE_ENTRY,
  CFB_LEAGUE_ENTRY,
  isCatalogSlugVisible,
  isLeagueCardVisible,
  leagueLogoForTheme,
} from "@/config/leagues";

test("CFB registry entry matches spec", () => {
  assert.equal(CFB_LEAGUE_ENTRY.name, "NCAA Football");
  assert.equal(CFB_LEAGUE_ENTRY.slug, "cfb");
  assert.equal(CFB_LEAGUE_ENTRY.startDate, "Aug 29");
  assert.equal(CFB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CFB_LEAGUE_ENTRY.dataVerified, false);
  assert.equal(CFB_LEAGUE_ENTRY.logos.light, "/assets/logos/ncaa-blue.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos.dark, "/assets/logos/ncaa-white.svg");
});

test("CBB registry entry matches spec", () => {
  assert.equal(CBB_LEAGUE_ENTRY.name, "NCAA Basketball");
  assert.equal(CBB_LEAGUE_ENTRY.slug, "cbb");
  assert.equal(CBB_LEAGUE_ENTRY.startDate, "Nov 2026");
  assert.equal(CBB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CBB_LEAGUE_ENTRY.dataVerified, false);
});

test("isLeagueCardVisible hides unverified NCAA leagues", () => {
  assert.equal(isLeagueCardVisible("cfb"), false);
  assert.equal(isLeagueCardVisible("cbb"), false);
  assert.equal(isLeagueCardVisible("nba"), true);
});

test("isCatalogSlugVisible hides NCAA slugs until verified", () => {
  assert.equal(isCatalogSlugVisible("cfb"), false);
  assert.equal(isCatalogSlugVisible("cbb"), false);
  assert.equal(isCatalogSlugVisible("serie-a"), true);
});

test("leagueLogoForTheme resolves dual-theme logo paths", () => {
  assert.equal(
    leagueLogoForTheme("cfb", "light"),
    "/assets/logos/ncaa-blue.svg",
  );
  assert.equal(
    leagueLogoForTheme("cbb", "dark"),
    "/assets/logos/ncaa-white.svg",
  );
  assert.equal(leagueLogoForTheme("nba", "light"), undefined);
});
