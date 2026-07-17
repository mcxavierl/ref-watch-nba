import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { getTeam as getEplTeam } from "@/lib/epl/teams";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { getTeam as getLaligaTeam } from "@/lib/laliga/teams";
import type { LeagueId } from "@/lib/leagues";
import { getTeam as getNflTeam } from "@/lib/nfl/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";
import { getTeam as getNbaTeam } from "@/lib/teams";

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

function formatMeetingResult(
  game: RuntimeGameLogEntry,
  leagueId: LeagueId,
  meetingCount: number,
): string {
  const away = game.awayTeam.toUpperCase();
  const home = game.homeTeam.toUpperCase();
  const prefix = meetingCount === 1 ? "Score" : "Most recent score";
  const scoreLine = `${away} ${game.awayScore}, ${home} ${game.homeScore}`;

  if (game.awayScore === game.homeScore) {
    const tieLabel =
      leagueId === "epl" || leagueId === "laliga" ? "draw" : "tie";
    return `${prefix}: ${scoreLine} (${tieLabel}).`;
  }

  const winner = game.awayScore > game.homeScore ? away : home;
  return `${prefix}: ${scoreLine} (${winner} won).`;
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function teamCityForLeague(leagueId: LeagueId, abbr: string): string | undefined {
  const key = abbr.toUpperCase();
  const team =
    leagueId === "nba"
      ? getNbaTeam(key)
      : leagueId === "nhl"
        ? getNhlTeam(key)
        : leagueId === "nfl"
          ? getNflTeam(key === "SD" ? "LAC" : key)
          : leagueId === "epl"
            ? getEplTeam(key)
            : leagueId === "laliga"
              ? getLaligaTeam(key)
              : leagueId === "cbb"
                ? getCbbTeam(key)
                : leagueId === "cfb"
                  ? getCfbTeam(key)
                  : undefined;
  return team?.city;
}

function latestHeadToHeadMeeting(
  leagueId: LeagueId,
  awayTeam: string,
  homeTeam: string,
): RuntimeGameLogEntry | undefined {
  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return undefined;
  const logs = loadRuntimeGameLogs(dataLeague);
  if (!logs?.games?.length) return undefined;

  const meetings = logs.games.filter((game) =>
    isHeadToHead(game, awayTeam, homeTeam, leagueId),
  );
  if (meetings.length === 0) return undefined;

  return [...meetings].sort(
    (a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId),
  )[0];
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
  const latest = [...meetings].sort(
    (a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId),
  )[0]!;
  const averages = `${scopeLabel} (${count} ${meetingLabel}): avg ${avgPoints.toFixed(1)} ${scorePhraseForLeague(leagueId)} and ${avgWhistle.toFixed(1)} ${whistleNounForLeague(leagueId)} per game.`;
  return `${averages} ${formatMeetingResult(latest, leagueId, count)}`;
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

/** Compact last-meeting note for inline slate rows (date, site, score). */
export function buildOverviewLastMeetingLine(
  leagueId: LeagueId,
  awayTeam: string,
  homeTeam: string,
): string | undefined {
  const latest = latestHeadToHeadMeeting(leagueId, awayTeam, homeTeam);
  if (!latest) return undefined;

  const homeAbbr = latest.homeTeam.toUpperCase();
  const awayAbbr = latest.awayTeam.toUpperCase();
  const city = teamCityForLeague(leagueId, homeAbbr);
  const location = city ? `in ${city}` : `at ${homeAbbr}`;
  const dateLabel = formatShortDate(latest.date);
  const score = `${awayAbbr} ${latest.awayScore}, ${homeAbbr} ${latest.homeScore}`;

  return `Last met ${dateLabel} ${location} · ${score}`;
}
