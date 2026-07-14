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

test("isDashboardLeagueExposed shows pro leagues and conference-gated NCAA when live", () => {
  assert.equal(isDashboardLeagueExposed("nba"), true);
  assert.equal(isDashboardLeagueExposed("laliga"), true);
  assert.equal(isDashboardLeagueExposed("cfb"), isNcaaConferenceGatedLive("cfb"));
  assert.equal(isDashboardLeagueExposed("cbb"), isNcaaConferenceGatedLive("cbb"));
});

test("isLeagueAnalyticsUnlocked unlocks NCAA when conference data is live", () => {
  assert.equal(isLeagueAnalyticsUnlocked("nba"), true);
  assert.equal(isLeagueAnalyticsUnlocked("cfb"), isNcaaConferenceGatedLive("cfb"));
  assert.equal(isLeagueAnalyticsUnlocked("cbb"), isNcaaConferenceGatedLive("cbb"));
});

test("isLeagueCardVisible follows conference-gated NCAA visibility", () => {
  assert.equal(isLeagueCardVisible("cfb"), isNcaaConferenceGatedLive("cfb"));
  assert.equal(isLeagueCardVisible("cbb"), isNcaaConferenceGatedLive("cbb"));
  assert.equal(isLeagueCardVisible("nba"), true);
});

test("isCatalogSlugVisible hides NCAA slugs until conference data is live", () => {
  assert.equal(isCatalogSlugVisible("cfb"), isNcaaConferenceGatedLive("cfb"));
  assert.equal(isCatalogSlugVisible("cbb"), isNcaaConferenceGatedLive("cbb"));
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
