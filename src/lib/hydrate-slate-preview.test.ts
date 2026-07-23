import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  hydrateOverviewSlatePreview,
  previewNeedsHydration,
} from "@/lib/hydrate-slate-preview";

function baseGame(overrides: Partial<OverviewSlateEntry> = {}): OverviewSlateEntry {
  return {
    leagueId: "wnba",
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    gameId: "401999999",
    matchup: "DAL @ POR",
    awayTeam: "DAL",
    homeTeam: "POR",
    crewCount: 3,
    status: "live",
    officialsLine: "Head ref Tiara Cruse",
    ...overrides,
  };
}

const dalPorCrew = [
  { name: "Tiara Cruse", number: 0, role: "crew_chief" as const },
  { name: "Randy Richardson", number: 0, role: "referee" as const },
  { name: "Toni Patillo", number: 0, role: "umpire" as const },
];

describe("hydrate slate preview", () => {
  it("detects stale previews that need a rebuild", () => {
    assert.equal(
      previewNeedsHydration(
        baseGame({
          preview: {
            awaitingCrew: false,
            avgFouls: 0,
            sampleGames: 0,
            crew: [],
            refTeamRows: [],
          } as unknown as OverviewSlateEntry["preview"],
        }),
        dalPorCrew,
      ),
      true,
    );
  });

  it("rebuilds preview metrics when live crew arrives", () => {
    const hydrated = hydrateOverviewSlatePreview(
      baseGame({
        preview: {
          awaitingCrew: false,
          avgFouls: 0,
          sampleGames: 0,
          crew: [],
          refTeamRows: [],
        } as unknown as OverviewSlateEntry["preview"],
      }),
      dalPorCrew,
    );

    assert.ok((hydrated.preview?.avgFouls ?? 0) > 0);
    assert.ok((hydrated.preview?.sampleGames ?? 0) > 0);
    assert.ok((hydrated.preview?.refTeamRows?.length ?? 0) > 0);
    assert.equal(
      hydrated.preview?.refTeamRows?.some((row) => row.teamAbbr === "DAL"),
      true,
    );
  });
});
