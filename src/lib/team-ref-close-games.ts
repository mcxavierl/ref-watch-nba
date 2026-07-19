import { refSlug } from "@/lib/data";
import {
  loadRuntimeGameLogs,
  type DataLeague,
  type RuntimeGameLogEntry,
} from "@/lib/game-logs";
import type {
  TeamRefCloseGameSummary,
  TeamRefCloseGamesStat,
} from "@/lib/team-ref-close-games-display";

export type {
  TeamRefCloseGameSummary,
  TeamRefCloseGamesStat,
} from "@/lib/team-ref-close-games-display";
export { formatTeamRefCloseGamesTooltip } from "@/lib/team-ref-close-games-display";

/** League-aware final-margin threshold for ref×team close-game counts. */
export function closeGameMarginThreshold(league: DataLeague): number {
  switch (league) {
    case "NHL":
    case "EPL":
    case "LALIGA":
      return 2;
    case "NBA":
    case "CBB":
      return 5;
    case "NFL":
    case "CFB":
      return 7;
    default:
      return 5;
  }
}

export function isCloseGameByMargin(
  game: RuntimeGameLogEntry,
  league: DataLeague,
): boolean {
  const threshold = closeGameMarginThreshold(league);
  return Math.abs(game.homeScore - game.awayScore) <= threshold;
}

function teamPerspective(
  game: RuntimeGameLogEntry,
  teamAbbr: string,
): { teamScore: number; opponentScore: number; opponent: string } {
  const abbr = teamAbbr.toUpperCase();
  if (game.homeTeam === abbr) {
    return {
      teamScore: game.homeScore,
      opponentScore: game.awayScore,
      opponent: game.awayTeam,
    };
  }
  return {
    teamScore: game.awayScore,
    opponentScore: game.homeScore,
    opponent: game.homeTeam,
  };
}

function gameMatchesRef(game: RuntimeGameLogEntry, slug: string): boolean {
  return game.officials.some((o) => refSlug(o.name, o.number) === slug);
}

function gameMatchesTeam(game: RuntimeGameLogEntry, teamAbbr: string): boolean {
  const abbr = teamAbbr.toUpperCase();
  return game.homeTeam === abbr || game.awayTeam === abbr;
}

/** Close-game counts per ref for one team, derived from verified game logs. */
export function computeTeamRefCloseGames(
  league: DataLeague,
  teamAbbr: string,
): Record<string, TeamRefCloseGamesStat> {
  const logs = loadRuntimeGameLogs(league);
  if (!logs?.games.length) return {};

  const byRef: Record<string, TeamRefCloseGamesStat> = {};

  for (const game of logs.games) {
    if (!gameMatchesTeam(game, teamAbbr)) continue;

    const margin = Math.abs(game.homeScore - game.awayScore);
    const isClose = isCloseGameByMargin(game, league);
    const perspective = teamPerspective(game, teamAbbr);

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (!slug) continue;

      if (!byRef[slug]) {
        byRef[slug] = { closeCount: 0, totalGames: 0, closeGames: [] };
      }

      const stat = byRef[slug];
      stat.totalGames += 1;
      if (isClose) {
        stat.closeCount += 1;
        stat.closeGames.push({
          date: game.date,
          opponent: perspective.opponent,
          teamScore: perspective.teamScore,
          opponentScore: perspective.opponentScore,
          margin,
        });
      }
    }
  }

  for (const stat of Object.values(byRef)) {
    stat.closeGames.sort((a, b) => b.date.localeCompare(a.date));
  }

  return byRef;
}

/** Server-side helper: close stats for one ref×team pair. */
export function teamRefCloseGamesForSlug(
  map: Record<string, TeamRefCloseGamesStat>,
  refSlugKey: string,
  fallbackGames: number,
): TeamRefCloseGamesStat {
  const stat = map[refSlugKey];
  if (stat) return stat;
  return { closeCount: 0, totalGames: fallbackGames, closeGames: [] };
}
