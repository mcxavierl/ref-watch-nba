import test from "node:test";
import assert from "node:assert/strict";
import {
  CBB_LEAGUE_ENTRY,
  CFB_LEAGUE_ENTRY,
  NCAA_BRAND_ASSETS,
  formatLeagueSeasonStart,
  isCatalogSlugVisible,
  isDashboardLeagueExposed,
  isLeagueAnalyticsUnlocked,
  isLeagueCardVisible,
  leagueLogoForTheme,
} from "@/config/leagues";

test("NCAA brand assets map to dual-theme logo paths", () => {
  assert.equal(NCAA_BRAND_ASSETS.themeColor, "#009CDE");
  assert.equal(NCAA_BRAND_ASSETS.logos.light, "/assets/logos/ncaa-blue.svg");
  assert.equal(NCAA_BRAND_ASSETS.logos.dark, "/assets/logos/ncaa-white.svg");
});

test("college leagues use sport-specific NCAA marks", () => {
  assert.equal(CBB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa-cbb-blue.svg");
  assert.equal(CBB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa-cbb-white.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa-cfb-blue.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa-cfb-white.svg");
});

test("CFB registry entry matches spec", () => {
  assert.equal(CFB_LEAGUE_ENTRY.name, "NCAA Football");
  assert.equal(CFB_LEAGUE_ENTRY.slug, "cfb");
  assert.equal(formatLeagueSeasonStart("cfb"), "08/29");
  assert.equal(CFB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CFB_LEAGUE_ENTRY.dataVerified, false);
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa-cfb-blue.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa-cfb-white.svg");
});

test("CBB registry entry matches spec", () => {
  assert.equal(CBB_LEAGUE_ENTRY.name, "NCAA Basketball");
  assert.equal(CBB_LEAGUE_ENTRY.slug, "cbb");
  assert.equal(formatLeagueSeasonStart("cbb"), "11/04");
  assert.equal(CBB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CBB_LEAGUE_ENTRY.dataVerified, false);
});

test("isDashboardLeagueExposed only shows verified live leagues", () => {
  assert.equal(isDashboardLeagueExposed("cfb"), false);
  assert.equal(isDashboardLeagueExposed("cbb"), false);
  assert.equal(isDashboardLeagueExposed("nba"), true);
  assert.equal(isDashboardLeagueExposed("laliga"), true);
});

test("isLeagueAnalyticsUnlocked keeps NCAA hubs locked until verified", () => {
  assert.equal(isLeagueAnalyticsUnlocked("cfb"), false);
  assert.equal(isLeagueAnalyticsUnlocked("cbb"), false);
  assert.equal(isLeagueAnalyticsUnlocked("nba"), true);
});

test("manual dataVerified flag is the first NCAA analytics gate", () => {
  assert.equal(CBB_LEAGUE_ENTRY.dataVerified, false);
  assert.equal(CFB_LEAGUE_ENTRY.dataVerified, false);
  assert.equal(isLeagueAnalyticsUnlocked("cbb"), false);
  assert.equal(isLeagueAnalyticsUnlocked("cfb"), false);
});

test("isLeagueCardVisible hides NCAA until verified live", () => {
  assert.equal(isLeagueCardVisible("cfb"), false);
  assert.equal(isLeagueCardVisible("cbb"), false);
  assert.equal(isLeagueCardVisible("nba"), true);
});

test("isCatalogSlugVisible hides NCAA slugs until verified live", () => {
  assert.equal(isCatalogSlugVisible("cfb"), false);
  assert.equal(isCatalogSlugVisible("cbb"), false);
  assert.equal(isCatalogSlugVisible("serie-a"), true);
});

test("leagueLogoForTheme resolves dual-theme logo paths", () => {
  assert.equal(
    leagueLogoForTheme("cfb", "light"),
    "/assets/logos/ncaa-cfb-blue.svg",
  );
  assert.equal(
    leagueLogoForTheme("cbb", "dark"),
    "/assets/logos/ncaa-cbb-white.svg",
  );
  assert.equal(leagueLogoForTheme("nba", "light"), undefined);
});
