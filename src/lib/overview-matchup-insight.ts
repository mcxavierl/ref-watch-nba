import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";

const LEAGUE_TO_DATA: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

const RECENT_SEASON_WINDOW = 5;

function teamAliases(leagueId: LeagueId, abbr: string): string[] {
  const key = abbr.toUpperCase();
  if (leagueId === "nfl" && (key === "LAC" || key === "SD")) return ["LAC", "SD"];
  return [key];
}

function isHeadToHead(
  game: RuntimeGameLogEntry,
  awayTeam: string,
  homeTeam: string,
  leagueId: LeagueId,
): boolean {
  const away = new Set(teamAliases(leagueId, awayTeam));
  const home = new Set(teamAliases(leagueId, homeTeam));
  const gameAway = game.awayTeam.toUpperCase();
  const gameHome = game.homeTeam.toUpperCase();
  return (
    (away.has(gameAway) && home.has(gameHome)) ||
    (away.has(gameHome) && home.has(gameAway))
  );
}

function scorePhraseForLeague(leagueId: LeagueId): string {
  if (leagueId === "nhl" || leagueId === "epl" || leagueId === "laliga") {
    return "total goals";
  }
  return "total points";
}

function whistleNounForLeague(leagueId: LeagueId): string {
  if (leagueId === "nhl") return "minors";
  if (leagueId === "nfl" || leagueId === "cfb") return "flags";
  if (leagueId === "epl" || leagueId === "laliga") return "cards";
  return "fouls";
}

function distinctSeasons(games: RuntimeGameLogEntry[]): string[] {
  return [...new Set(games.map((game) => game.season))].sort();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatInsightLine(
  scopeLabel: string,
  meetings: RuntimeGameLogEntry[],
  leagueId: LeagueId,
): string {
  const count = meetings.length;
  const meetingLabel = count === 1 ? "meeting" : "meetings";
  const avgPoints = average(meetings.map((game) => game.totalPoints));
  const avgWhistle = average(meetings.map((game) => game.totalFouls));
  return `${scopeLabel} (${count} ${meetingLabel}): avg ${avgPoints.toFixed(1)} ${scorePhraseForLeague(leagueId)} and ${avgWhistle.toFixed(1)} ${whistleNounForLeague(leagueId)} per game.`;
}

/** Build-time head-to-head pace note for overview slate rows. */
export function buildOverviewMatchupInsight(
  leagueId: LeagueId,
  awayTeam: string,
  homeTeam: string,
): string | undefined {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return undefined;
  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games?.length) return undefined;

  const allMeetings = logs.games.filter((game) =>
    isHeadToHead(game, awayTeam, homeTeam, leagueId),
  );
  if (allMeetings.length === 0) return undefined;

  const seasons = distinctSeasons(logs.games);
  const recentSeasons = new Set(seasons.slice(-RECENT_SEASON_WINDOW));
  const recentMeetings = allMeetings.filter((game) => recentSeasons.has(game.season));

  if (recentMeetings.length > 0) {
    return formatInsightLine("Last 5 seasons", recentMeetings, leagueId);
  }

  return formatInsightLine("All-time sample", allMeetings, leagueId);
}
