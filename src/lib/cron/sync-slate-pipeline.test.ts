import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRunFilesystemAssignmentSync } from "@/lib/cron/sync-slate-pipeline";
import { enrichSlateLiveCrews } from "@/lib/slate-live-crews-server";
import { mergeSlateLiveCrews } from "@/lib/slate-live-crews";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

describe("sync-slate-pipeline", () => {
  it("detects local data directory for assignment sync", () => {
    assert.equal(typeof canRunFilesystemAssignmentSync(), "boolean");
    assert.equal(canRunFilesystemAssignmentSync(), true);
  });

  it("enriches live crew payloads before slate merge", () => {
    const game = {
      leagueId: "wnba",
      leagueLabel: "WNBA",
      leagueShortLabel: "WNBA",
      href: "/wnba",
      gameId: "401999999",
      matchup: "DAL @ POR",
      awayTeam: "DAL",
      homeTeam: "POR",
      crewCount: 0,
      status: "scheduled",
      officialsLine: "Refs not assigned yet",
    } as OverviewSlateEntry;
    const crewUpdate = {
      leagueId: "wnba" as const,
      gameId: "401999999",
      crew: [
        { name: "Tiara Cruse", number: 0, role: "crew_chief" as const },
        { name: "Randy Richardson", number: 0, role: "referee" as const },
        { name: "Toni Patillo", number: 0, role: "umpire" as const },
      ],
    };

    const merged = mergeSlateLiveCrews(
      [game],
      enrichSlateLiveCrews([game], [crewUpdate]),
    );

    assert.ok((merged[0]?.preview?.avgFouls ?? 0) > 0);
  });
});
