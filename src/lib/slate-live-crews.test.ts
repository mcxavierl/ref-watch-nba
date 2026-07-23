import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { mergeSlateLiveCrews } from "@/lib/slate-live-crews";
import { enrichSlateLiveCrews } from "@/lib/slate-live-crews-server";

function baseGame(overrides: Partial<OverviewSlateEntry> = {}): OverviewSlateEntry {
  return {
    leagueId: "wnba",
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    gameId: "401857086",
    matchup: "PHO @ LAS",
    awayTeam: "PHO",
    homeTeam: "LAS",
    crewCount: 0,
    status: "scheduled",
    officialsLine: "Refs not assigned yet",
    ...overrides,
  };
}

describe("slate live crews", () => {
  it("merges ESPN officials into WNBA slate rows", () => {
    const merged = mergeSlateLiveCrews(
      [baseGame()],
      [
        {
          leagueId: "wnba",
          gameId: "401857086",
          crew: [
            { name: "Timothy Greene", number: 9, role: "crew_chief" },
            { name: "Angelica Suffren", number: 7, role: "referee" },
            { name: "Josh Reed", number: 46, role: "umpire" },
          ],
        },
      ],
    );

    assert.equal(merged[0]?.crewCount, 3);
    assert.match(merged[0]?.officialsLine ?? "", /Head ref Angelica Suffren/);
    assert.equal(merged[0]?.status, "live");
  });

  it("merges hydrated preview payloads from server crew updates", () => {
    const game = baseGame({
      gameId: "401999999",
      matchup: "DAL @ POR",
      awayTeam: "DAL",
      homeTeam: "POR",
      preview: {
        awaitingCrew: false,
        avgFouls: 0,
        sampleGames: 0,
        crew: [],
        refTeamRows: [],
      } as unknown as OverviewSlateEntry["preview"],
    });
    const crewUpdate = {
      leagueId: "wnba" as const,
      gameId: "401999999",
      crew: [
        { name: "Tiara Cruse", number: 0, role: "crew_chief" as const },
        { name: "Randy Richardson", number: 0, role: "referee" as const },
        { name: "Toni Patillo", number: 0, role: "umpire" as const },
      ],
    };
    const enriched = enrichSlateLiveCrews([game], [crewUpdate]);
    const merged = mergeSlateLiveCrews([game], enriched);

    assert.ok((merged[0]?.preview?.avgFouls ?? 0) > 0);
    assert.ok((merged[0]?.preview?.refTeamRows?.length ?? 0) > 0);
  });
});
