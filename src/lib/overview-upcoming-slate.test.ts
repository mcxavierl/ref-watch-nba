import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLeagueSlateCounts,
  groupOverviewSlateByLeague,
  type OverviewSlateEntry,
} from "@/lib/overview-slate-shared";
import {
  buildLeagueHubUpcomingSchedule,
  buildLeagueUpcomingSlateFromAssignments,
  buildOverviewUpcomingSlate,
  LEAGUE_UPCOMING_SLATE_LIMIT,
  selectHomepageSlateGrid,
} from "@/lib/overview-upcoming-slate";
import { ASSIGNED_WNBA_GAME_FIXTURE } from "@/lib/wnba/test-fixtures";
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
    assert.equal(
      slate.leagueGroup?.games[0]?.gameContextLine,
      "Detroit beat the Chargers in 2023 in Los Angeles, 41-38.",
    );
    assert.equal(slate.leagueGroup?.games[0]?.seasonStageNote, "Pre-season game");
    assert.equal(slate.leagueNote?.note, file.note);
  });

  it("builds hub schedule capped at limit with per-game slate dates", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-08T04:01:07.016Z",
      date: "2026-08-06",
      source: "espn",
      games: [],
      scheduledGames: Array.from({ length: 12 }, (_, index) => ({
        id: `40177297${index}`,
        matchup: `TEA${index} @ DET`,
        awayTeam: `T${index}`,
        homeTeam: "DET",
        league: "NFL",
        seasonStage: "preseason" as const,
        slateDate: `2026-08-${String(6 + index).padStart(2, "0")}`,
        crew: [],
      })),
    };

    const slate = buildLeagueHubUpcomingSchedule("nfl", file, 6);

    assert.equal(slate.leagueGroup?.games.length, 6);
    assert.equal(slate.leagueGroup?.games[0]?.slateDate, "2026-08-06");
    assert.equal(slate.leagueGroup?.games[5]?.slateDate, "2026-08-11");
  });

  it("builds EPL slate with team context and officials status", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-17T19:00:00.000Z",
      date: "2026-08-09",
      source: "seeded",
      games: [],
      scheduledGames: [
        {
          id: "epl-fa-cov-ars-2026",
          matchup: "COV @ ARS",
          awayTeam: "COV",
          homeTeam: "ARS",
          league: "EPL",
          seasonStage: "exhibition",
          crew: [],
        },
      ],
      nextSlateDate: "2026-08-09",
      note: "Next EPL slate is 2026-08-09 (FA Cup fixture). Match officials not published yet.",
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("epl", file);

    assert.equal(slate.inSeason, true);
    assert.equal(slate.leagueGroup?.games[0]?.matchup, "COV @ ARS");
    assert.equal(slate.leagueGroup?.games[0]?.seasonStageNote, "Exhibition match");
    assert.equal(slate.leagueGroup?.games[0]?.officialsLine, "Officials TBD");
    assert.match(
      slate.leagueGroup?.games[0]?.teamContextLine ?? "",
      /Recent form: COV: no recent EPL log on file · ARS beat CRY 2-1 away/,
    );
  });

  it("builds La Liga slate with named referee and actionable metadata", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-17T19:00:00.000Z",
      date: "2026-08-15",
      source: "seeded",
      games: [],
      scheduledGames: [
        {
          id: "laliga-748151-2026",
          matchup: "OVI @ VIL",
          awayTeam: "OVI",
          homeTeam: "VIL",
          league: "LALIGA",
          crew: [{ name: "Alejandro Muñiz Ruiz", number: 0, role: "referee" }],
        },
      ],
      nextSlateDate: "2026-08-15",
      note: "2026-27 La Liga opener at Villarreal. Referee named from prior season slate.",
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("laliga", file);

    assert.equal(slate.inSeason, true);
    assert.equal(slate.leagueGroup?.liveCount, 1);
    assert.equal(slate.leagueGroup?.scheduledCount, 0);
    assert.equal(slate.leagueGroup?.games[0]?.matchup, "OVI @ VIL");
    assert.equal(slate.leagueGroup?.games[0]?.status, "live");
    assert.equal(
      slate.leagueGroup?.games[0]?.officialsLine,
      "Referee: Alejandro Muñiz Ruiz",
    );
    assert.match(
      slate.leagueGroup?.games[0]?.teamContextLine ?? "",
      /Recent form: OVI lost to MLL 3-0 away/,
    );
    assert.equal(
      slate.leagueGroup?.games[0]?.gameContextLine,
      "Villarreal beat Real Oviedo in 2025 at Villarreal, 2-0.",
    );
  });

  it("caps league hub slates at six games with confirmed crews first", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      date: "2026-07-20",
      source: "seeded",
      games: Array.from({ length: 12 }, (_, index) => ({
        id: `wnba-${index}`,
        matchup: `TEAM${index} @ HOST${index}`,
        awayTeam: `TEAM${index}`,
        homeTeam: `HOST${index}`,
        league: "WNBA",
        crew: [{ name: `Ref ${index}`, number: index, role: "referee" }],
      })),
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("wnba", file);
    assert.equal(slate.leagueGroup?.games.length, LEAGUE_UPCOMING_SLATE_LIMIT);
    assert.equal(slate.leagueGroup?.liveCount, LEAGUE_UPCOMING_SLATE_LIMIT);
  });

  it("normalizes WNBA city names to canonical abbreviations in slate entries", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      date: "2026-07-20",
      source: "official.nba.com",
      games: [
        {
          id: "wnba-las-vegas-0-toronto-0-2",
          matchup: "Las Vegas @ Toronto",
          awayTeam: "Las Vegas",
          homeTeam: "Toronto",
          league: "WNBA",
          crew: [],
        },
      ],
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("wnba", file);
    const game = slate.leagueGroup?.games[0];

    assert.equal(game?.awayTeam, "LVA");
    assert.equal(game?.homeTeam, "TOR");
    assert.equal(game?.matchup, "LVA @ TOR");
  });

  it("marks in-progress games live and carries scores from assignments", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-21T00:00:00.000Z",
      date: "2026-07-20",
      source: "espn",
      games: [
        {
          id: "401857084",
          matchup: "WAS @ GSV",
          awayTeam: "WAS",
          homeTeam: "GSV",
          league: "WNBA",
          slateDate: "2026-07-20",
          gameStatus: "STATUS_IN_PROGRESS",
          awayScore: 54,
          homeScore: 52,
          gameClock: "Q3 5:42",
          crew: [
            { name: "Roy Gulbeyan", number: 42, role: "crew_chief" },
          ],
        },
        {
          id: "401857083",
          matchup: "LVA @ TOR",
          awayTeam: "LVA",
          homeTeam: "TOR",
          league: "WNBA",
          slateDate: "2026-07-20",
          gameStatus: "STATUS_FINAL",
          awayScore: 109,
          homeScore: 83,
          gameClock: "Final",
          crew: [
            { name: "Timothy Greene", number: 9, role: "crew_chief" },
          ],
        },
      ],
    };

    const slate = buildLeagueUpcomingSlateFromAssignments("wnba", file);
    const liveGame = slate.leagueGroup?.games.find((game) => game.gameId === "401857084");
    const finalGame = slate.leagueGroup?.games.find((game) => game.gameId === "401857083");

    assert.equal(liveGame?.status, "live");
    assert.equal(liveGame?.gamePhase, "live");
    assert.equal(liveGame?.awayScore, 54);
    assert.equal(liveGame?.homeScore, 52);
    assert.equal(liveGame?.gameClock, "Q3 5:42");
    assert.equal(finalGame?.status, "final");
    assert.equal(finalGame?.gamePhase, "final");
    assert.equal(finalGame?.awayScore, 109);
    assert.equal(finalGame?.homeScore, 83);
  });

  it("shows assigned WNBA crews before tipoff", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-22T00:00:00.000Z",
      date: "2026-07-22",
      source: "official.nba.com",
      games: [
        {
          id: "401857087",
          matchup: "MIN @ SEA",
          awayTeam: "MIN",
          homeTeam: "SEA",
          league: "WNBA",
          slateDate: "2026-07-22",
          slateStartAt: "2026-07-22T19:00Z",
          crew: [
            { name: "Amy Bonner", number: 31, role: "crew_chief" },
            { name: "Kevin Fahy", number: 43, role: "referee" },
            { name: "Toni Patillo", number: 76, role: "umpire" },
          ],
        },
      ],
    };

    const slate = buildLeagueHubUpcomingSchedule("wnba", file, 5);
    assert.equal(
      slate.leagueGroup?.games[0]?.officialsLine,
      "Head ref Kevin Fahy · 3-person crew",
    );
    assert.equal(slate.leagueGroup?.games[0]?.crewCount, 3);
  });

  it("uses refs-not-assigned copy for WNBA scheduled games", () => {
    const file: AssignmentsFile = {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      date: "2026-07-21",
      source: "espn",
      games: [
        {
          id: "401857083",
          matchup: "LVA @ TOR",
          awayTeam: "LVA",
          homeTeam: "TOR",
          league: "WNBA",
          slateDate: "2026-07-21",
          crew: [],
        },
      ],
    };

    const slate = buildLeagueHubUpcomingSchedule("wnba", file, 5);
    assert.equal(slate.leagueGroup?.games[0]?.officialsLine, "Refs not assigned yet");
    assert.equal(slate.leagueGroup?.games[0]?.status, "scheduled");
    assert.equal(slate.leagueGroup?.games[0]?.preview?.awaitingCrew, true);
    assert.equal(slate.leagueGroup?.games[0]?.preview?.crew.length, 0);
  });

  it("attaches preview card insights when a crew is assigned", () => {
    const game = ASSIGNED_WNBA_GAME_FIXTURE;

    const slate = buildLeagueUpcomingSlateFromAssignments("wnba", {
      lastUpdated: "2026-07-22T00:00:00.000Z",
      date: "2026-07-22",
      source: "official.nba.com",
      games: [game],
      scheduledGames: [],
    });
    const entry = slate.leagueGroup?.games[0];

    assert.ok(entry?.preview);
    assert.ok(Array.isArray(entry?.previewCardInsights));
    if (entry?.previewCardInsights && entry.previewCardInsights.length > 0) {
      assert.ok(
        entry.previewCardInsights.every((line) => !line.startsWith("Last met")),
      );
    }
  });

  it("features soonest upcoming games on the homepage grid", () => {
    const games: OverviewSlateEntry[] = [
      slateEntry({
        leagueId: "wnba",
        gameId: "w-later",
        status: "scheduled",
        slateDate: "2026-08-01",
        slateStartAt: "2026-08-01T23:00:00.000Z",
      }),
      slateEntry({
        leagueId: "nba",
        gameId: "n-live",
        status: "live",
        slateDate: "2026-07-20",
      }),
      slateEntry({
        leagueId: "wnba",
        gameId: "w-soon",
        status: "scheduled",
        slateDate: "2026-07-21",
        slateStartAt: "2026-07-21T23:30:00.000Z",
      }),
    ];

    const grid = selectHomepageSlateGrid(games);
    assert.deepEqual(
      grid.map((game) => game.gameId),
      ["n-live", "w-soon", "w-later"],
    );
  });

  it("orders homepage grid chronologically across leagues", () => {
    const games: OverviewSlateEntry[] = [
      slateEntry({ leagueId: "laliga", gameId: "l1", status: "live", slateDate: "2026-08-15" }),
      slateEntry({ leagueId: "wnba", gameId: "w1", status: "live", slateDate: "2026-07-20" }),
      slateEntry({ leagueId: "nfl", gameId: "n1", status: "scheduled", slateDate: "2026-08-06" }),
      slateEntry({ leagueId: "epl", gameId: "e1", status: "scheduled", slateDate: "2026-08-09" }),
    ];

    const grid = selectHomepageSlateGrid(games);
    assert.deepEqual(
      grid.map((game) => game.gameId),
      ["w1", "l1", "n1", "e1"],
    );
  });

  it("does not duplicate WNBA games in the cross-league overview slate", () => {
    const slate = buildOverviewUpcomingSlate();
    assert.equal(slate.games.length, 9);
    const wnbaGames = slate.games.filter((game) => game.leagueId === "wnba");
    const wnbaIds = wnbaGames.map((game) => game.gameId);
    assert.equal(
      new Set(wnbaIds).size,
      wnbaIds.length,
      `duplicate WNBA game ids in homepage slate: ${wnbaIds.join(", ")}`,
    );

    const lvaTorCount = slate.games.filter(
      (game) =>
        game.leagueId === "wnba" &&
        game.awayTeam === "LVA" &&
        game.homeTeam === "TOR",
    ).length;
    assert.ok(
      lvaTorCount <= 1,
      `expected at most one LVA @ TOR card, found ${lvaTorCount}`,
    );
  });
});
