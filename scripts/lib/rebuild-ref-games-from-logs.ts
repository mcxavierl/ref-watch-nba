import {
  countRefGamesFromLogs,
  countRefGamesFromLogsMatching,
  dedupeByGameId,
} from "../../src/lib/game-count";
import type { GameLogFile } from "./game-logs";
import { dedupeRefsInPlace } from "./merge-duplicate-refs";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
  type RefVariant,
} from "./ref-identity";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "./ref-team-stats";
import { refSlug } from "./slug";
import { teamWonGame } from "./team-win";
import { teamFoulsFromGameLog } from "../../src/lib/team-foul-split";
import type { RefGameRecord, RefProfile, RefStatsFile } from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface RebuildRefGamesOptions {
  /** NBA-style canonical name key; false uses slug(name, number) per official. */
  useCanonicalKey?: boolean;
  seasons?: readonly string[];
}

function countForRef(
  ref: RefProfile,
  logs: GameLogFile,
  useCanonicalKey: boolean,
  seasons?: readonly string[],
): number {
  if (useCanonicalKey) {
    return countRefGamesFromLogsMatching(
      logs.games,
      (official) =>
        canonicalRefKey(official.name) === canonicalRefKey(ref.name),
      seasons,
    );
  }
  return countRefGamesFromLogs(logs.games, ref.slug, seasons);
}

/** Recompute ref.games and teamStats from DISTINCT game_id rows in game logs. */
export function rebuildRefGamesFromLogs(
  stats: RefStatsFile,
  logs: GameLogFile,
  options: RebuildRefGamesOptions = {},
): RefStatsFile {
  const useCanonicalKey = options.useCanonicalKey ?? true;
  const seasonSet = options.seasons
    ? new Set(options.seasons)
    : stats.meta.seasons?.length
      ? new Set(stats.meta.seasons)
      : null;
  const seasons = seasonSet ? [...seasonSet] : undefined;

  const refGames = new Map<string, RefGameRecord[]>();
  const refIdentities = new Map<string, Map<number, RefVariant>>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const seenRefGame = new Map<string, Set<string>>();

  for (const game of logs.games) {
    if (seasonSet && game.season && !seasonSet.has(game.season)) continue;

    const overHit = game.totalPoints > game.closingTotal;
    const homeWin = game.homeScore > game.awayScore;

    for (const official of game.officials) {
      const refKey = useCanonicalKey
        ? canonicalRefKey(official.name)
        : refSlug(official.name, official.number);

      if (useCanonicalKey) {
        const variants = refIdentities.get(refKey) ?? new Map<number, RefVariant>();
        const variant =
          variants.get(official.number) ??
          { name: official.name, number: official.number, games: 0, lastDate: "" };
        variant.games += 1;
        if (game.date >= variant.lastDate) {
          variant.lastDate = game.date;
          variant.name = official.name;
        }
        variants.set(official.number, variant);
        refIdentities.set(refKey, variants);
      }

      const seen = seenRefGame.get(refKey) ?? new Set<string>();
      if (game.gameId && seen.has(game.gameId)) continue;
      if (game.gameId) seen.add(game.gameId);
      seenRefGame.set(refKey, seen);

      const record: RefGameRecord = {
        gameId: game.gameId,
        date: game.date,
        season: game.season,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
        overHit,
        raptorsInvolved:
          game.homeTeam === "TOR" || game.awayTeam === "TOR",
      };

      const list = refGames.get(refKey) ?? [];
      list.push(record);
      refGames.set(refKey, list);

      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const isHome = game.homeTeam === teamAbbr;
        const teamWin = teamWonGame(
          game.homeScore,
          game.awayScore,
          game.homeTeam,
          game.awayTeam,
          teamAbbr,
        );
        const fouls = teamFoulsFromGameLog(game, isHome);

        pushRefTeamGame(refTeamBuckets, refKey, teamAbbr, {
          gameId: game.gameId,
          foulDifferential: fouls.teamFouls - fouls.opponentFouls,
          totalPoints: game.totalPoints,
          overHit,
          teamWin,
        });
      }
    }
  }

  const canonicalKeyForRef = (ref: RefProfile): string =>
    useCanonicalKey ? canonicalRefKey(ref.name) : ref.slug;

  const refs: RefProfile[] = stats.refs.map((ref) => {
    const refKey = canonicalKeyForRef(ref);
    const deduped = dedupeByGameId(refGames.get(refKey) ?? []);
    const verified = countForRef(ref, logs, useCanonicalKey, seasons);

    if (verified === 0) {
      return ref;
    }

    if (deduped.length === 0) {
      return { ...ref, games: verified };
    }

    const n = deduped.length;
    const avgTotal =
      deduped.reduce((sum, row) => sum + row.totalPoints, 0) / n;
    const avgFouls =
      deduped.reduce((sum, row) => sum + row.totalFouls, 0) / n;
    const overRate = deduped.filter((row) => row.overHit).length / n;

    return {
      ...ref,
      games: verified,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      totalPointsDelta: round1(avgTotal - stats.meta.leagueAvgTotal),
      foulsDelta: round1(avgFouls - stats.meta.leagueAvgFouls),
      seasons: [...new Set(deduped.map((row) => row.season))].sort(),
      recentGames: [...deduped]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      teamStats: collectRefTeamStats(refTeamBuckets.get(refKey) ?? new Map()),
    };
  });

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, stats.meta.leagueAvgTotal, stats.meta.leagueAvgFouls);

  return {
    ...stats,
    refs,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
      refCount: refs.length,
      note:
        `${stats.meta.note ?? ""} Ref game counts rebuilt from DISTINCT game_id in game logs.`.trim(),
    },
  };
}
