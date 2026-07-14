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
import { isNcaaConferenceGatedLive } from "@/lib/verified-live-leagues";

test("NCAA brand assets map to dual-theme logo paths", () => {
  assert.equal(NCAA_BRAND_ASSETS.themeColor, "#009CDE");
  assert.equal(NCAA_BRAND_ASSETS.logos.light, "/assets/logos/ncaa.png");
  assert.equal(NCAA_BRAND_ASSETS.logos.dark, "/assets/logos/ncaa.png");
});

test("college leagues use sport-specific NCAA marks", () => {
  assert.equal(CBB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.png");
  assert.equal(CBB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.png");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.png");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.png");
});

test("CFB registry entry matches spec", () => {
  assert.equal(CFB_LEAGUE_ENTRY.name, "NCAA Football");
  assert.equal(CFB_LEAGUE_ENTRY.slug, "cfb");
  assert.equal(formatLeagueSeasonStart("cfb"), "08/29");
  assert.equal(CFB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CFB_LEAGUE_ENTRY.dataVerified, true);
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.png");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.png");
});

test("CBB registry entry matches spec", () => {
  assert.equal(CBB_LEAGUE_ENTRY.name, "NCAA Basketball");
  assert.equal(CBB_LEAGUE_ENTRY.slug, "cbb");
  assert.equal(formatLeagueSeasonStart("cbb"), "11/04");
  assert.equal(CBB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CBB_LEAGUE_ENTRY.dataVerified, true);
});

test("isDashboardLeagueExposed shows all verified live leagues including college", () => {
  assert.equal(isDashboardLeagueExposed("nba"), true);
  assert.equal(isDashboardLeagueExposed("laliga"), true);
  assert.equal(isDashboardLeagueExposed("cfb"), true);
  assert.equal(isDashboardLeagueExposed("cbb"), true);
});

test("isLeagueAnalyticsUnlocked unlocks NCAA when conference data is live", () => {
  assert.equal(isLeagueAnalyticsUnlocked("nba"), true);
  assert.equal(isLeagueAnalyticsUnlocked("cfb"), isNcaaConferenceGatedLive("cfb"));
  assert.equal(isLeagueAnalyticsUnlocked("cbb"), isNcaaConferenceGatedLive("cbb"));
});

test("isLeagueCardVisible shows launched college leagues on the overview hub", () => {
  assert.equal(isLeagueCardVisible("cfb"), true);
  assert.equal(isLeagueCardVisible("cbb"), true);
  assert.equal(isLeagueCardVisible("nba"), true);
});

test("isCatalogSlugVisible shows launched college slugs on the overview hub", () => {
  assert.equal(isCatalogSlugVisible("cfb"), true);
  assert.equal(isCatalogSlugVisible("cbb"), true);
  assert.equal(isCatalogSlugVisible("serie-a"), true);
});

test("leagueLogoForTheme resolves dual-theme logo paths", () => {
  assert.equal(
    leagueLogoForTheme("cfb", "light"),
    "/assets/logos/ncaa.png",
  );
  assert.equal(
    leagueLogoForTheme("cbb", "dark"),
    "/assets/logos/ncaa.png",
  );
  assert.equal(leagueLogoForTheme("nba", "light"), undefined);
});
