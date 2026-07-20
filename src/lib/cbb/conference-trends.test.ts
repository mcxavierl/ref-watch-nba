import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCbbConferenceTrendRows,
  cbbTrendsConferenceLabel,
} from "@/lib/cbb/conference-trends";
import { readCbbTrendsConferenceParam } from "@/lib/cbb/conference-trends-shared";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

function cbbGame(
  season: string,
  home: string,
  away: string,
  totalPoints: number,
  totalFouls: number,
): RuntimeGameLogEntry {
  return {
    gameId: `${season}-${home}-${away}`,
    date: "2024-01-10",
    season,
    league: "CBB",
    homeTeam: home,
    awayTeam: away,
    homeScore: totalPoints / 2,
    awayScore: totalPoints / 2,
    totalPoints,
    totalFouls,
    closingTotal: totalPoints + 2,
    homeSpread: -2,
    lineSource: "external",
    officials: [{ name: "Sample Ref", number: 11, role: "referee" }],
  };
}

describe("cbb conference trends", () => {
  it("parses conference slugs from the URL", () => {
    assert.equal(readCbbTrendsConferenceParam(undefined), "all");
    assert.equal(readCbbTrendsConferenceParam("sec"), "SEC");
    assert.equal(readCbbTrendsConferenceParam("big-ten"), "Big Ten");
    assert.equal(readCbbTrendsConferenceParam("unknown"), "all");
  });

  it("builds per-season rows for a selected conference", () => {
    const games = [
      cbbGame("2023-24", "DUKE", "UNC", 140, 34),
      cbbGame("2023-24", "DUKE", "UVA", 132, 30),
      cbbGame("2023-24", "ALA", "AUB", 150, 42),
      cbbGame("2024-25", "DUKE", "UNC", 138, 36),
      cbbGame("2024-25", "ALA", "AUB", 148, 40),
    ];

    const secRows = buildCbbConferenceTrendRows(
      games,
      ["2023-24", "2024-25"],
      "SEC",
    );
    assert.deepEqual(secRows, [
      {
        season: "2023-24",
        gameCount: 1,
        leagueAvgTotal: 150,
        leagueAvgFouls: 42,
      },
      {
        season: "2024-25",
        gameCount: 1,
        leagueAvgTotal: 148,
        leagueAvgFouls: 40,
      },
    ]);

    const accRows = buildCbbConferenceTrendRows(
      games,
      ["2023-24", "2024-25"],
      "ACC",
    );
    assert.equal(accRows.length, 2);
    assert.equal(accRows[0]?.gameCount, 2);
    assert.equal(accRows[0]?.leagueAvgTotal, 136);
    assert.equal(accRows[0]?.leagueAvgFouls, 32);
  });

  it("labels all-conference scope for narrative copy", () => {
    assert.equal(cbbTrendsConferenceLabel("all"), "All conferences");
    assert.equal(cbbTrendsConferenceLabel("SEC"), "SEC");
  });
});
