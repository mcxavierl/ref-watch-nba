import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLeagueSlateCounts,
  groupOverviewSlateByLeague,
  type OverviewSlateEntry,
} from "@/lib/overview-slate-shared";
import { buildLeagueUpcomingSlateFromAssignments } from "@/lib/overview-upcoming-slate";
import type { AssignmentsFile } from "@/lib/types";

function slateEntry(
  overrides: Partial<OverviewSlateEntry> & Pick<OverviewSlateEntry, "leagueId" | "gameId" | "status">,
): OverviewSlateEntry {
  return {
    leagueLabel: "NBA",
    leagueShortLabel: "NBA",
    href: "/",
    matchup: "BOS @ LAL",
    awayTeam: "BOS",
    homeTeam: "LAL",
    crewCount: 3,
    ...overrides,
  };
}

describe("overview-upcoming-slate", () => {
  it("formats live and scheduled counts for league headers", () => {
    assert.equal(formatLeagueSlateCounts(2, 5), "2 live · 5 scheduled");
    assert.equal(formatLeagueSlateCounts(1, 0), "1 live");
    assert.equal(formatLeagueSlateCounts(0, 3), "3 scheduled");
    assert.equal(formatLeagueSlateCounts(0, 0), "");
  });

  it("groups slate entries by league with accurate counts", () => {
    const games: OverviewSlateEntry[] = [
      slateEntry({ leagueId: "nfl", gameId: "nfl-1", status: "live", matchup: "DAL @ PHI" }),
      slateEntry({ leagueId: "nfl", gameId: "nfl-2", status: "scheduled", matchup: "GB @ CHI" }),
      slateEntry({ leagueId: "nba", gameId: "nba-1", status: "live", matchup: "BOS @ LAL" }),
      slateEntry({ leagueId: "nba", gameId: "nba-2", status: "scheduled", matchup: "MIA @ NYK" }),
      slateEntry({ leagueId: "nba", gameId: "nba-3", status: "scheduled", matchup: "DEN @ PHX" }),
    ];

    const groups = groupOverviewSlateByLeague(games);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.leagueId, "nba");
    assert.equal(groups[0]?.liveCount, 1);
    assert.equal(groups[0]?.scheduledCount, 2);
    assert.equal(groups[0]?.href, "/nba");
    assert.equal(groups[1]?.leagueId, "nfl");
    assert.equal(groups[1]?.liveCount, 1);
    assert.equal(groups[1]?.scheduledCount, 1);
    assert.equal(groups[1]?.href, "/nfl");
    assert.equal(groups[0]?.games[0]?.status, "live");
    assert.equal(groups[0]?.games[1]?.status, "scheduled");
  });

  it("builds a single-league slate from assignments with scheduled games", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-08T04:01:07.016Z",
      date: "2026-08-06",
      source: "espn",
      games: [],
      scheduledGames: [
        {
          id: "401772971",
          matchup: "LAC @ DET",
          awayTeam: "LAC",
          homeTeam: "DET",
          league: "NFL",
          crew: [],
        },
      ],
      nextSlateDate: "2026-08-06",
      note: "Next NFL slate is 2026-08-06 (1 game on ESPN). Crew assignments not published yet.",
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("nfl", file);

    assert.equal(slate.inSeason, true);
    assert.equal(slate.leagueGroup?.scheduledCount, 1);
    assert.equal(slate.leagueGroup?.liveCount, 0);
    assert.equal(slate.leagueGroup?.games[0]?.matchup, "LAC @ DET");
    assert.equal(slate.leagueGroup?.games[0]?.status, "scheduled");
    assert.match(
      slate.leagueGroup?.games[0]?.lastMeetingLine ?? "",
      /Last met Nov 12, 2023 in Los Angeles · DET 41, LAC 38/,
    );
    assert.equal(slate.leagueNote?.note, file.note);
  });
});
