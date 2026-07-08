import {
  NBA_SEASON_OPENERS,
  sumOfficialRegularSeasonRecord,
} from "@/lib/nba-team-season-records";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export interface TeamRecordQueryOptions {
  /** Include postseason games (NBA gameId prefix 004). Default false. */
  includePlayoffs?: boolean;
  /** Restrict to these season labels (e.g. meta.seasons). */
  seasons?: string[];
  /** Earliest season label inclusive (e.g. "2021-22"). */
  sinceSeason?: string;
}

export interface TeamGameLogRow {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export function isNbaPlayoffGame(gameId: string): boolean {
  return gameId.startsWith("004");
}

export function isOnOrAfterSeasonOpener(date: string, season: string): boolean {
  const opener = NBA_SEASON_OPENERS[season];
  if (!opener) return true;
  return date >= opener;
}

export function teamWonGameRow(
  game: Pick<TeamGameLogRow, "homeTeam" | "awayTeam" | "homeScore" | "awayScore">,
  teamAbbr: string,
): boolean | null {
  const abbr = teamAbbr.toUpperCase();
  if (game.homeTeam === abbr) return game.homeScore > game.awayScore;
  if (game.awayTeam === abbr) return game.awayScore > game.homeScore;
  return null;
}

export function filterTeamGameLogs(
  games: TeamGameLogRow[],
  teamAbbr: string,
  options: TeamRecordQueryOptions = {},
): TeamGameLogRow[] {
  const abbr = teamAbbr.toUpperCase();
  const includePlayoffs = options.includePlayoffs ?? false;
  const sinceSeason = options.sinceSeason ?? "2021-22";
  const allowedSeasons = options.seasons
    ? new Set(options.seasons)
    : null;

  return games.filter((game) => {
    if (game.homeTeam !== abbr && game.awayTeam !== abbr) return false;
    if (!includePlayoffs && isNbaPlayoffGame(game.gameId)) return false;
    if (game.season < sinceSeason) return false;
    if (allowedSeasons && !allowedSeasons.has(game.season)) return false;
    if (!isOnOrAfterSeasonOpener(game.date, game.season)) return false;
    return true;
  });
}

export function computeTeamRecordFromGameLogs(
  games: TeamGameLogRow[],
  teamAbbr: string,
  options?: TeamRecordQueryOptions,
): TeamSampleRecord {
  const filtered = filterTeamGameLogs(games, teamAbbr, options);
  let wins = 0;
  let losses = 0;
  for (const game of filtered) {
    const won = teamWonGameRow(game, teamAbbr);
    if (won === null) continue;
    if (won) wins++;
    else losses++;
  }
  const gamesCount = wins + losses;
  return {
    wins,
    losses,
    games: gamesCount,
    winRate: gamesCount > 0 ? wins / gamesCount : 0,
  };
}

/** Authoritative regular-season record for display (official standings). */
export function getOfficialTeamRegularSeasonRecord(
  teamAbbr: string,
  seasons: string[],
  options: Pick<TeamRecordQueryOptions, "sinceSeason"> = {},
): TeamSampleRecord {
  const sinceSeason = options.sinceSeason ?? "2021-22";
  const scoped = seasons.filter((s) => s >= sinceSeason);
  const { wins, losses } = sumOfficialRegularSeasonRecord(teamAbbr, scoped);
  const games = wins + losses;
  return {
    wins,
    losses,
    games,
    winRate: games > 0 ? wins / games : 0,
  };
}
