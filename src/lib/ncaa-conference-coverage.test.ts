import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import {
  buildNcaaConferenceCoverageRows,
  countDistinctGamesByConference,
  getConferenceCoverageRows,
  ncaaConferenceMaturityLabel,
  ncaaConferenceMaturityTier,
} from "@/lib/ncaa-conference-coverage";
import { beginWorkerIsolateRequest } from "@/lib/worker-isolate-store";

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

  it("reads hydrated CBB game logs when data/ is unavailable on Workers", () => {
    beginWorkerIsolateRequest();
    setCachedGameLogs("CBB", {
      lastUpdated: "2026-07-16T00:00:00.000Z",
      league: "CBB",
      source: "ESPN",
      games: Array.from({ length: 600 }, (_, index) => ({
        gameId: `acc-${index}`,
        date: "2025-01-01",
        season: "2024-25",
        league: "CBB",
        homeTeam: "DUKE",
        awayTeam: "UNC",
        homeScore: 70,
        awayScore: 68,
        totalPoints: 138,
        totalFouls: 36,
        closingTotal: 140,
        homeSpread: -3,
        lineSource: "synthetic",
        officials: [],
      })),
    });

    const rows = getConferenceCoverageRows("cbb");
    assert.equal(rows.find((row) => row.conferenceId === "ACC")?.maturity, "Live");
    assert.equal(rows.find((row) => row.conferenceId === "ACC")?.distinctGames, 600);
  });
});
