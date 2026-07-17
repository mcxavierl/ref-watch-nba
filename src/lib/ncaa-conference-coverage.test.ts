import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  setCachedCbbConferenceCoverage,
  getCachedCbbConferenceCoverage,
  clearCachedCbbConferenceCoverage,
} from "@/lib/cbb/conference-coverage-preload";
import {
  buildNcaaConferenceCoverageRows,
  countDistinctGamesByConference,
  getConferenceCoverageRows,
  ncaaConferenceMaturityLabel,
  ncaaConferenceMaturityTier,
} from "@/lib/ncaa-conference-coverage";

describe("ncaa conference coverage maturity", () => {
  it("maps game counts to partial, building, and live tiers", () => {
    assert.equal(ncaaConferenceMaturityTier(107), "partial");
    assert.equal(ncaaConferenceMaturityTier(350), "building");
    assert.equal(ncaaConferenceMaturityTier(802), "live");
    assert.equal(ncaaConferenceMaturityLabel("partial"), "Partial");
    assert.equal(ncaaConferenceMaturityLabel("building"), "Building");
    assert.equal(ncaaConferenceMaturityLabel("live"), "Live");
  });

  it("counts distinct games touching each conference territory", () => {
    const games = [
      { gameId: "g1", homeTeam: "DUKE", awayTeam: "UNC" },
      { gameId: "g2", homeTeam: "DUKE", awayTeam: "HOU" },
      { gameId: "g1", homeTeam: "DUKE", awayTeam: "UNC" },
    ];
    const conf = (abbr: string) => {
      if (abbr === "DUKE" || abbr === "UNC") return "ACC" as const;
      if (abbr === "HOU") return "Big 12" as const;
      return null;
    };
    const counts = countDistinctGamesByConference(games, conf, [
      "ACC",
      "Big 12",
    ]);
    assert.equal(counts.ACC, 2);
    assert.equal(counts["Big 12"], 0);
  });

  it("builds coverage rows with maturity labels", () => {
    const rows = buildNcaaConferenceCoverageRows(
      { ACC: 802, "Big 12": 107, SEC: 930, "Big Ten": 1102, "Big East": 59 },
      ["ACC", "Big Ten", "Big 12", "SEC", "Big East"],
    );
    assert.equal(rows.find((r) => r.conferenceId === "Big 12")?.label, "Partial");
    assert.equal(rows.find((r) => r.conferenceId === "ACC")?.label, "Live");
  });

  it("uses preloaded CBB conference snapshot on Workers", () => {
    setCachedCbbConferenceCoverage({
      generatedAt: new Date().toISOString(),
      distinctByConference: {
        ACC: 802,
        "Big Ten": 1102,
        "Big 12": 520,
        SEC: 930,
        "Big East": 610,
      },
    });

    const rows = getConferenceCoverageRows("cbb");
    assert.equal(rows.every((row) => row.maturity === "Live"), true);
    assert.equal(getCachedCbbConferenceCoverage()?.distinctByConference.ACC, 802);

    setCachedCbbConferenceCoverage({
      generatedAt: new Date().toISOString(),
      distinctByConference: {
        ACC: 0,
        "Big Ten": 0,
        "Big 12": 0,
        SEC: 0,
        "Big East": 0,
      },
    });
    clearCachedCbbConferenceCoverage();
  });

  it("reads CBB conference snapshot from disk when cache is empty", () => {
    const rows = getConferenceCoverageRows("cbb");
    assert.ok(rows.some((row) => row.maturity === "Live"));
    assert.ok(rows.every((row) => row.distinctGames >= 500));
  });
});
