import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { mergeSlateLiveCrews } from "@/lib/slate-live-crews";

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
});
