import { normalizeRefName } from "@/lib/bbr-ref-team-records";
import { DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import { loadRuntimeGameLogs, type RuntimeGameLogEntry } from "@/lib/game-logs";
import {
  opponentTiersForSeason,
  type OpponentTier,
} from "@/lib/nba-strength-of-schedule";
import {
  isNbaPlayoffGame,
  isOnOrAfterSeasonOpener,
  teamWonGameRow,
} from "@/lib/team-record-query";
import { fuzzyMatchRef } from "@/lib/stats-query/ref-fuzzy-match";
import { resolveTeamAbbr } from "@/lib/stats-query/team-resolve";
import {
  normalizeStatsQuery,
  sampleFlagForN,
  validateStatsQuery,
  type StatsQuery,
  type StatsQueryOpponentTier,
  type StatsQueryResult,
} from "@/lib/stats-query/schema";
import { wilsonScoreInterval } from "@/lib/stats-query/wilson-ci";

function mapOpponentTier(tier: StatsQueryOpponentTier): OpponentTier {
  if (tier === "mid") return "mid10";
  return tier;
}

function seasonList(query: StatsQuery): Set<string> | null {
  if (!query.season) return null;
  const list = Array.isArray(query.season) ? query.season : [query.season];
  return new Set(list);
}

function officialMatchesRef(
  game: RuntimeGameLogEntry,
  refName: string,
): boolean {
  const norm = normalizeRefName(refName);
  return game.officials.some((o) => normalizeRefName(o.name) === norm);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

type TeamScheduleEntry = {
  date: string;
  game: RuntimeGameLogEntry;
};

function buildTeamSchedule(
  games: RuntimeGameLogEntry[],
  teamAbbr: string,
): TeamScheduleEntry[] {
  const abbr = teamAbbr.toUpperCase();
  return games
    .filter((g) => g.homeTeam === abbr || g.awayTeam === abbr)
    .map((game) => ({ date: game.date, game }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function priorGameDate(
  schedule: TeamScheduleEntry[],
  date: string,
): string | null {
  let prior: string | null = null;
  for (const entry of schedule) {
    if (entry.date >= date) break;
    prior = entry.date;
  }
  return prior;
}

function teamRestDaysBefore(
  schedule: TeamScheduleEntry[],
  date: string,
): number | null {
  const prior = priorGameDate(schedule, date);
  if (!prior) return null;
  return daysBetween(prior, date);
}

function passesContext(
  game: RuntimeGameLogEntry,
  teamAbbr: string,
  context: StatsQuery["context"],
  teamSchedule: TeamScheduleEntry[],
  allGames: RuntimeGameLogEntry[],
): boolean {
  if (!context) return true;

  const teamRest = teamRestDaysBefore(teamSchedule, game.date);
  const oppAbbr =
    game.homeTeam === teamAbbr ? game.awayTeam : game.homeTeam;
  const oppSchedule = buildTeamSchedule(allGames, oppAbbr);
  const oppRest = teamRestDaysBefore(oppSchedule, game.date);

  if (context === "back_to_back") {
    return teamRest === 1;
  }

  if (context === "rest_advantage") {
    if (teamRest === null || oppRest === null) return false;
    return teamRest > oppRest;
  }

  return true;
}

function passesFilters(
  game: RuntimeGameLogEntry,
  query: StatsQuery,
  teamAbbr: string,
  refName: string | null,
  allowedSeasons: Set<string> | null,
  teamSchedule: TeamScheduleEntry[],
  allGames: RuntimeGameLogEntry[],
): boolean {
  const isHome = game.homeTeam === teamAbbr;
  const isAway = game.awayTeam === teamAbbr;
  if (!isHome && !isAway) return false;

  if (query.location === "home" && !isHome) return false;
  if (query.location === "away" && !isAway) return false;

  if (!allowedSeasons && game.season < DEFAULT_SINCE_SEASON) return false;
  if (allowedSeasons && !allowedSeasons.has(game.season)) return false;
  if (!isOnOrAfterSeasonOpener(game.date, game.season)) return false;
  if (isNbaPlayoffGame(game.gameId)) return false;

  if (query.date_range) {
    if (game.date < query.date_range.start || game.date > query.date_range.end) {
      return false;
    }
  }

  if (refName && !officialMatchesRef(game, refName)) return false;

  if (query.opponent) {
    const opp = resolveTeamAbbr(query.opponent);
    const gameOpp = isHome ? game.awayTeam : game.homeTeam;
    if (gameOpp !== opp) return false;
  }

  if (query.opponent_tier) {
    const opp = isHome ? game.awayTeam : game.homeTeam;
    const tiers = opponentTiersForSeason(game.season);
    const tier = tiers[opp];
    if (!tier || tier !== mapOpponentTier(query.opponent_tier)) return false;
  }

  if (
    !passesContext(
      game,
      teamAbbr,
      query.context,
      teamSchedule,
      allGames,
    )
  ) {
    return false;
  }

  return true;
}

export function query_stats(raw: Partial<StatsQuery>): StatsQueryResult {
  const query = normalizeStatsQuery(raw);
  const errors = validateStatsQuery(query);
  if (errors.length > 0) {
    throw new Error(`Invalid StatsQuery: ${errors.join("; ")}`);
  }

  const teamAbbr = resolveTeamAbbr(query.team);
  const opponentAbbr = query.opponent
    ? resolveTeamAbbr(query.opponent)
    : null;

  let refName: string | null = null;
  let refSlug: string | null = null;
  if (query.ref) {
    const match = fuzzyMatchRef(query.ref);
    if (!match) {
      return {
        wins: 0,
        losses: 0,
        n: 0,
        win_pct: 0,
        wilson_ci_low: 0,
        wilson_ci_high: 0,
        sample_flag: "insufficient",
        resolved: {
          ref_slug: null,
          ref_name: query.ref,
          team: teamAbbr,
          opponent: opponentAbbr,
        },
      };
    }
    refName = match.ref.name;
    refSlug = match.ref.slug;
  }

  const logFile = loadRuntimeGameLogs("NBA");
  const games = logFile?.games ?? [];
  const allowedSeasons = seasonList(query);
  const teamSchedule = buildTeamSchedule(games, teamAbbr);

  let wins = 0;
  let losses = 0;

  for (const game of games) {
    if (
      !passesFilters(
        game,
        query,
        teamAbbr,
        refName,
        allowedSeasons,
        teamSchedule,
        games,
      )
    ) {
      continue;
    }

    const won = teamWonGameRow(game, teamAbbr);
    if (won === null) continue;
    if (won) wins++;
    else losses++;
  }

  const n = wins + losses;
  const win_pct = n > 0 ? wins / n : 0;
  const { low, high } = wilsonScoreInterval(wins, n);

  return {
    wins,
    losses,
    n,
    win_pct,
    wilson_ci_low: low,
    wilson_ci_high: high,
    sample_flag: sampleFlagForN(n),
    resolved: {
      ref_slug: refSlug,
      ref_name: refName,
      team: teamAbbr,
      opponent: opponentAbbr,
    },
  };
}
