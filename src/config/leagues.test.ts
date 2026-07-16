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
import { getRefStats as getCbbRefStats } from "@/lib/cbb/data";
import { getRefStats as getCfbRefStats } from "@/lib/cfb/data";

test("NCAA brand assets map to dual-theme logo paths", () => {
  assert.equal(NCAA_BRAND_ASSETS.themeColor, "#009CDE");
  assert.equal(NCAA_BRAND_ASSETS.logos.light, "/assets/logos/ncaa.svg");
  assert.equal(NCAA_BRAND_ASSETS.logos.dark, "/assets/logos/ncaa.svg");
});

test("college leagues use sport-specific NCAA marks", () => {
  assert.equal(CBB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.svg");
  assert.equal(CBB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.svg");
});

test("CFB registry entry matches spec", () => {
  assert.equal(CFB_LEAGUE_ENTRY.name, "NCAA Football");
  assert.equal(CFB_LEAGUE_ENTRY.slug, "cfb");
  assert.equal(formatLeagueSeasonStart("cfb"), "08/29");
  assert.equal(CFB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CFB_LEAGUE_ENTRY.dataVerified, true);
  assert.equal(CFB_LEAGUE_ENTRY.logos?.light, "/assets/logos/ncaa.svg");
  assert.equal(CFB_LEAGUE_ENTRY.logos?.dark, "/assets/logos/ncaa.svg");
});

test("CBB registry entry matches spec", () => {
  assert.equal(CBB_LEAGUE_ENTRY.name, "NCAA Basketball");
  assert.equal(CBB_LEAGUE_ENTRY.slug, "cbb");
  assert.equal(formatLeagueSeasonStart("cbb"), "11/04");
  assert.equal(CBB_LEAGUE_ENTRY.themeColor, "#009CDE");
  assert.equal(CBB_LEAGUE_ENTRY.dataVerified, true);
});

test("isDashboardLeagueExposed shows pro leagues and launched NCAA hubs", () => {
  assert.equal(isDashboardLeagueExposed("nba"), true);
  assert.equal(isDashboardLeagueExposed("laliga"), true);
  assert.equal(isDashboardLeagueExposed("cbb"), true);
  assert.equal(isDashboardLeagueExposed("cfb"), false);
});

test("isCollegeLiveLeague reflects launched NCAA hubs from Priority #9 gate", async () => {
  const { isCollegeLiveLeague, LAUNCHED_NCAA_LEAGUE_IDS } = await import(
    "@/lib/verified-live-leagues"
  );
  assert.deepEqual([...LAUNCHED_NCAA_LEAGUE_IDS], ["cbb"]);
  assert.equal(isCollegeLiveLeague("cbb"), true);
  assert.equal(isCollegeLiveLeague("cfb"), false);
});

test("isLeagueAnalyticsUnlocked keeps NCAA locked until conference data is live", () => {
  assert.equal(isLeagueAnalyticsUnlocked("nba"), true);
  assert.equal(isLeagueAnalyticsUnlocked("cfb", getCfbRefStats()), false);
  assert.equal(isLeagueAnalyticsUnlocked("cbb", getCbbRefStats()), false);
});

test("isLeagueAnalyticsUnlocked keeps NCAA locked without live conference coverage", () => {
  const emptyStats = {
    refs: [],
    meta: {
      source: "espn" as const,
      data_verified: true,
      seasons: [],
      refCount: 0,
      totalGamesProcessed: 0,
      minSampleSize: 15,
      leagueOverBaseline: 0.5,
      lastUpdated: "2026-01-01",
      atsAvailable: false,
    },
  };
  assert.equal(isLeagueAnalyticsUnlocked("cfb", emptyStats), false);
  assert.equal(isLeagueAnalyticsUnlocked("cbb", emptyStats), false);
});

test("isLeagueCardVisible shows launched NCAA hubs on the overview hub", () => {
  assert.equal(isLeagueCardVisible("cfb"), false);
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
    "/assets/logos/ncaa.svg",
  );
  assert.equal(
    leagueLogoForTheme("cbb", "dark"),
    "/assets/logos/ncaa.svg",
  );
  assert.equal(leagueLogoForTheme("nba", "light"), undefined);
});
