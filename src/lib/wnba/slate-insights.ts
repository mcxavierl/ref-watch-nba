import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildOverviewLastMeetingLine,
  buildOverviewMatchupInsight,
  buildOverviewTeamRecentContextLine,
} from "@/lib/overview-matchup-insight";
import type { RankingsInsight } from "@/lib/rankings-synthesis";
import { resolveSlateGames } from "@/lib/grudge-match";
import type { AssignmentsFile } from "@/lib/types";

function readGameLogAverages(): { avgTotal: number; avgFouls: number } {
  try {
    const filePath = path.join(process.cwd(), "data", "wnba", "game-logs.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      games: Array<{ totalPoints: number; totalFouls: number }>;
    };
    const games = raw.games ?? [];
    if (games.length === 0) return { avgTotal: 165, avgFouls: 34 };
    const avgTotal =
      games.reduce((sum, game) => sum + game.totalPoints, 0) / games.length;
    const avgFouls =
      games.reduce((sum, game) => sum + game.totalFouls, 0) / games.length;
    return {
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgFouls: Math.round(avgFouls * 10) / 10,
    };
  } catch {
    return { avgTotal: 165, avgFouls: 34 };
  }
}

function matchupPaceInsight(awayTeam: string, homeTeam: string): string {
  const insight = buildOverviewMatchupInsight("wnba", awayTeam, homeTeam);
  const lastMeeting = buildOverviewLastMeetingLine("wnba", awayTeam, homeTeam);
  const recent = buildOverviewTeamRecentContextLine("wnba", awayTeam, homeTeam);
  return [insight, lastMeeting, recent].filter(Boolean).join(" ");
}

/** Assignment-driven betting insights when verified ref profiles are not yet indexed. */
export function buildWnbaSlateInsights(
  assignments: AssignmentsFile,
  basePath: string,
): {
  pulse: RankingsInsight[];
  matchups: RankingsInsight[];
  spotlights: RankingsInsight[];
} {
  const { games } = resolveSlateGames(assignments);
  const pool = games.length > 0 ? games : [...(assignments.scheduledGames ?? [])];
  const leagueAverages = readGameLogAverages();

  const pulse: RankingsInsight[] = [
    {
      id: "wnba-league-pace",
      title: "League whistle pace",
      body: `WNBA sample averages ${leagueAverages.avgTotal} total points and ${leagueAverages.avgFouls} fouls per game. Use matchup context below for totals edges until crews publish.`,
      statLabel: "Avg total",
      statValue: String(leagueAverages.avgTotal),
      categoryHref: `${basePath}/research/trends`,
    },
  ];

  const matchups: RankingsInsight[] = pool.slice(0, 4).map((game) => {
    const crewAssigned = game.crew.length > 0;
    const crewLabel = crewAssigned
      ? game.crew.map((official) => official.name).join(", ")
      : "Refs not assigned yet";
    const paceContext = matchupPaceInsight(game.awayTeam, game.homeTeam);

    return {
      id: `wnba-matchup-${game.id}`,
      title: "Key matchup target",
      body: `${game.matchup} · ${crewLabel}. ${paceContext} Edge window opens once referee assignments publish.`,
      statLabel: crewAssigned ? "Crew" : "Assignment",
      statValue: crewAssigned ? "Assigned" : "Pending",
      categoryHref: `${basePath}/#slate-game-${game.id}`,
    };
  });

  const spotlights: RankingsInsight[] = pool.slice(0, 4).map((game) => ({
    id: `wnba-edge-${game.id}`,
    title: "Totals edge preview",
    body: game.crew.length
      ? `${game.matchup}: crew assigned. Cross-check whistle pace vs ${leagueAverages.avgFouls} league foul average before locking O/U.`
      : `${game.matchup}: referees not assigned yet. ${matchupPaceInsight(game.awayTeam, game.homeTeam)}`,
    statLabel: "Slate date",
    statValue: game.slateDate ?? assignments.date,
    categoryHref: `${basePath}/#slate-game-${game.id}`,
  }));

  return { pulse, matchups, spotlights };
}
