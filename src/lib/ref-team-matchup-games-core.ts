import { formatDeltaPp } from "@/lib/data-maturity";
import {
  insightDrilldownId,
  type InsightCrewPartner,
  type InsightDrilldownGame,
  type InsightDrilldownPayload,
  type InsightVenueSplit,
} from "@/lib/insight-drilldown-types";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { heroToneFromWinRateDelta } from "@/lib/metric-significance";
import { refSlug } from "@/lib/ref-slug";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

export type RefTeamMatchupInput = {
  leagueId: LeagueId;
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  /** W-L shown in the matrix or team leaderboard when available. */
  recordWins?: number;
  recordLosses?: number;
  baselineWinRate: number;
  leagueAvgFouls?: number;
};

function whistleLabelForLeague(leagueId: LeagueId): string {
  return LEAGUES[leagueId].metrics.whistleShort;
}

function whistleCountForGame(
  leagueId: LeagueId,
  game: RuntimeGameLogEntry,
): number {
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  if (leagueId === "nfl" || leagueId === "cfb") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  return game.totalFouls;
}

function spreadCoveredForTeam(
  game: RuntimeGameLogEntry,
  isHome: boolean,
): boolean | null {
  if (game.lineSource === "synthetic" || !Number.isFinite(game.homeSpread)) {
    return null;
  }
  const margin = isHome
    ? game.homeScore - game.awayScore
    : game.awayScore - game.homeScore;
  const adjusted = isHome ? margin + game.homeSpread : margin - game.homeSpread;
  if (adjusted === 0) return null;
  return adjusted > 0;
}

function opponentLabel(game: RuntimeGameLogEntry, teamAbbr: string): string {
  return game.homeTeam === teamAbbr ? game.awayTeam : game.homeTeam;
}

function venueSplit(rows: { teamWon: boolean }[]): InsightVenueSplit {
  const wins = rows.filter((row) => row.teamWon).length;
  const losses = rows.length - wins;
  return {
    wins,
    losses,
    games: rows.length,
    winRate: rows.length > 0 ? wins / rows.length : null,
  };
}

function crewPartnersForGames(
  games: RuntimeGameLogEntry[],
  refSlugValue: string,
): InsightCrewPartner[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (slug === refSlugValue) continue;
      counts.set(official.name, (counts.get(official.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, gamesWith]) => ({ name, games: gamesWith }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
}

function toInsightDrilldownGame(
  leagueId: LeagueId,
  game: RuntimeGameLogEntry,
  teamAbbr: string,
): InsightDrilldownGame {
  const isHome = game.homeTeam === teamAbbr;
  const teamScore = isHome ? game.homeScore : game.awayScore;
  const opponentScore = isHome ? game.awayScore : game.homeScore;
  const teamWon = teamScore > opponentScore;

  return {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    isHome,
    opponentLabel: opponentLabel(game, teamAbbr),
    teamScore,
    opponentScore,
    scoreLine: `${teamScore}-${opponentScore}`,
    whistleCount: whistleCountForGame(leagueId, game),
    whistleLabel: whistleLabelForLeague(leagueId),
    spreadCovered: spreadCoveredForTeam(game, isHome),
    teamWon,
  };
}

/** Filter verified game logs for one ref×team pair. */
export function listRefTeamMatchupGamesFromEntries(
  games: RuntimeGameLogEntry[],
  refSlugValue: string,
  teamAbbr: string,
): RuntimeGameLogEntry[] {
  const abbr = teamAbbr.toUpperCase();
  return games.filter((game) => {
    const involvesTeam = game.homeTeam === abbr || game.awayTeam === abbr;
    const involvesRef = game.officials.some(
      (official) => refSlug(official.name, official.number) === refSlugValue,
    );
    return involvesTeam && involvesRef;
  });
}

export function buildRefTeamMatchupPayloadFromGames(
  input: RefTeamMatchupInput,
  matchupGames: RuntimeGameLogEntry[],
): InsightDrilldownPayload | null {
  const {
    leagueId,
    refSlug: refSlugValue,
    refName,
    teamAbbr,
    teamLabel,
    recordWins,
    recordLosses,
    baselineWinRate,
    leagueAvgFouls,
  } = input;

  const abbr = teamAbbr.toUpperCase();
  const tableGames = [...matchupGames]
    .sort((a, b) => b.date.localeCompare(a.date) || b.gameId.localeCompare(a.gameId))
    .map((game) => toInsightDrilldownGame(leagueId, game, abbr));

  if (tableGames.length === 0) return null;

  const computedWins = tableGames.filter((game) => game.teamWon).length;
  const computedLosses = tableGames.length - computedWins;
  const wins = recordWins ?? computedWins;
  const losses = recordLosses ?? computedLosses;
  const winRate = wins + losses > 0 ? wins / (wins + losses) : 0;
  const deltaPts = (winRate - baselineWinRate) * 100;
  const heroValue = formatDeltaPp(deltaPts);
  const heroLabel =
    deltaPts >= 0 ? "Above team baseline" : "Below team baseline";

  const homeRows = tableGames
    .filter((game) => game.isHome)
    .map((game) => ({ teamWon: game.teamWon }));
  const awayRows = tableGames
    .filter((game) => !game.isHome)
    .map((game) => ({ teamWon: game.teamWon }));

  return {
    drilldownId: insightDrilldownId(leagueId, refSlugValue, abbr),
    leagueId,
    refSlug: refSlugValue,
    refName,
    teamAbbr: abbr,
    teamLabel,
    heroValue,
    heroLabel,
    heroTone: heroToneFromWinRateDelta(deltaPts),
    wins,
    losses,
    winRate,
    baselineWinRate,
    deltaPts,
    games: tableGames,
    homeSplit: venueSplit(homeRows),
    awaySplit: venueSplit(awayRows),
    crewPartners: crewPartnersForGames(matchupGames, refSlugValue),
    ...(leagueAvgFouls !== undefined && Number.isFinite(leagueAvgFouls)
      ? { leagueAvgFouls }
      : {}),
  };
}

export function listRefTeamMatchupGames(
  refSlugValue: string,
  teamAbbr: string,
  games: RuntimeGameLogEntry[],
): RuntimeGameLogEntry[] {
  return listRefTeamMatchupGamesFromEntries(games, refSlugValue, teamAbbr);
}

export function buildRefTeamMatchupPayload(
  input: RefTeamMatchupInput,
  games: RuntimeGameLogEntry[],
): InsightDrilldownPayload | null {
  const matchupGames = listRefTeamMatchupGames(
    input.refSlug,
    input.teamAbbr,
    games,
  );
  return buildRefTeamMatchupPayloadFromGames(input, matchupGames);
}
