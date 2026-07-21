import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogComingSoonEntries,
  catalogLiveCompetitionEntries,
  catalogProLiveEntries,
  catalogStatusLabel,
  compareCatalogLeagues,
  isCatalogLeagueLive,
} from "@/lib/league-catalog";
import { PRO_ONLY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

const JULY_21_2026 = new Date(2026, 6, 21);

describe("league catalog live competitions", () => {
  it("lists pro live competitions and launched NCAA hubs", () => {
    const live = catalogLiveCompetitionEntries(JULY_21_2026);
    const liveIds = live.map((entry) => entry.leagueId);

    assert.ok(liveIds.includes("cbb"));
    assert.ok(!liveIds.includes("cfb"));
    assert.ok(liveIds.includes("nba"));

    for (const leagueId of PRO_ONLY_LIVE_LEAGUE_IDS) {
      assert.ok(liveIds.includes(leagueId), `${leagueId} should appear in live catalog`);
    }
  });

  it("orders pro leagues with in-season first, then by upcoming start date", () => {
    const proLive = catalogProLiveEntries(JULY_21_2026);
    const proIds = proLive.map((entry) => entry.leagueId);

    assert.deepEqual(proIds, [
      "wnba",
      "laliga",
      "epl",
      "nfl",
      "nhl",
      "nba",
    ]);
  });

  it("places only WNBA in-season on July 21, 2026", () => {
    const live = catalogLiveCompetitionEntries(JULY_21_2026);
    const inSeason = live.filter((entry) =>
      isCatalogLeagueLive(entry, JULY_21_2026),
    );

    assert.deepEqual(
      inSeason.map((entry) => entry.leagueId),
      ["wnba"],
    );
  });

  it("does not treat NFL as live before its season opener despite manifest status", () => {
    const nflEntry = catalogProLiveEntries(JULY_21_2026).find(
      (entry) => entry.leagueId === "nfl",
    );
    assert.ok(nflEntry);
    assert.equal(isCatalogLeagueLive(nflEntry, JULY_21_2026), false);
  });

  it("uses live status before chronological start date in the comparator", () => {
    const live = catalogLiveCompetitionEntries(JULY_21_2026);
    const wnba = live.find((entry) => entry.leagueId === "wnba");
    const laliga = live.find((entry) => entry.leagueId === "laliga");
    assert.ok(wnba && laliga);
    assert.equal(compareCatalogLeagues(wnba, laliga, JULY_21_2026), -1);
    assert.equal(compareCatalogLeagues(laliga, wnba, JULY_21_2026), 1);
  });

  it("shows unlaunched NCAA football as coming soon without live stats", () => {
    const soon = catalogComingSoonEntries();
    const cbb = soon.find((entry) => entry.id === "cbb");
    const cfb = soon.find((entry) => entry.id === "cfb");

    assert.equal(cbb, undefined);
    assert.ok(cfb);
    assert.equal(cfb.leagueId, undefined);
    assert.equal(catalogStatusLabel(cfb), "Coming Soon");
  });
});
