import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../../lib/ref-team-stats";
import { refSlug } from "../../lib/slug";
import type { GameLogFile } from "../../lib/game-logs";
import type { RefProfile, RefStatsFile, RefTeamStat } from "../../../src/lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Aggregate ref×team W-L and scoring splits from ESPN game logs. */
export function buildTeamStatsBucketsFromGameLogs(
  logs: GameLogFile,
): Map<string, Map<string, RefTeamGameRow[]>> {
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();

  for (const game of logs.games) {
    const homeWin = game.homeScore > game.awayScore;
    const overHit = game.totalPoints > game.closingTotal;

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);

      for (const [teamAbbr, teamWin, teamFouls, opponentFouls] of [
        [game.homeTeam, homeWin, game.homeFlags ?? 0, game.awayFlags ?? 0],
        [game.awayTeam, !homeWin, game.awayFlags ?? 0, game.homeFlags ?? 0],
      ] as const) {
        pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
          foulDifferential: teamFouls - opponentFouls,
          totalPoints: game.totalPoints,
          overHit,
          teamWin,
        });
      }
    }
  }

  return refTeamBuckets;
}

function mergePreservedTeamMetrics(
  rebuilt: RefTeamStat,
  existing: RefTeamStat | undefined,
): RefTeamStat {
  if (!existing) return rebuilt;
  return {
    ...rebuilt,
    avgFoulDifferential:
      existing.avgFoulDifferential || rebuilt.avgFoulDifferential,
    avgTotalPoints: existing.avgTotalPoints || rebuilt.avgTotalPoints,
    overRate: existing.overRate ?? rebuilt.overRate,
  };
}

export interface RebuildTeamStatsResult {
  stats: RefStatsFile;
  gameCount: number;
  refCount: number;
  teamStatsPairs: number;
  qualifiedPairs: number;
}

/** Replace ref×team W-L with values derived from stored game logs. */
export function applyGameLogTeamStats(
  stats: RefStatsFile,
  logs: GameLogFile,
): RebuildTeamStatsResult {
  const buckets = buildTeamStatsBucketsFromGameLogs(logs);
  const refsBySlug = new Map(stats.refs.map((ref) => [ref.slug, ref]));
  const officialMeta = new Map<string, { name: string; number: number }>();

  for (const game of logs.games) {
    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (!officialMeta.has(slug)) {
        officialMeta.set(slug, {
          name: official.name,
          number: official.number,
        });
      }
    }
  }

  const updatedRefs: RefProfile[] = stats.refs.map((ref) => {
    const byTeam = buckets.get(ref.slug);
    if (!byTeam || byTeam.size === 0) {
      return { ...ref, teamStats: {} };
    }

    const rebuilt = collectRefTeamStats(byTeam);
    const teamStats: Record<string, RefTeamStat> = {};
    for (const [team, stat] of Object.entries(rebuilt)) {
      teamStats[team] = mergePreservedTeamMetrics(stat, ref.teamStats?.[team]);
    }
    return { ...ref, teamStats };
  });

  for (const [slug, byTeam] of buckets) {
    if (refsBySlug.has(slug)) continue;
    const meta = officialMeta.get(slug);
    if (!meta) continue;

    const teamStats = collectRefTeamStats(byTeam);
    const games = [...byTeam.values()].reduce((sum, rows) => sum + rows.length, 0);
    const allRows = [...byTeam.values()].flat();
    const avgTotal =
      allRows.reduce((sum, row) => sum + row.totalPoints, 0) / allRows.length;
    const avgFouls =
      allRows.reduce((sum, row) => sum + Math.abs(row.foulDifferential), 0) /
      allRows.length;

    updatedRefs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(allRows.filter((row) => row.overHit).length / allRows.length),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - stats.meta.leagueAvgTotal),
      foulsDelta: round1(avgFouls - stats.meta.leagueAvgFouls),
      seasons: [],
      recentGames: [],
      teamStats,
    });
  }

  updatedRefs.sort((a, b) => b.games - a.games);

  const teamStatsPairs = updatedRefs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );
  const qualifiedPairs = updatedRefs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3).length,
    0,
  );

  return {
    stats: {
      ...stats,
      meta: {
        ...stats.meta,
        lastUpdated: new Date().toISOString(),
        refCount: updatedRefs.length,
        totalGamesProcessed: logs.games.length,
        source: stats.meta.source === "seeded" ? "espn" : stats.meta.source,
        note:
          `Ref×team W-L rebuilt from ${logs.games.length} ESPN game logs. ` +
          `${qualifiedPairs}/${teamStatsPairs} ref×team pairs meet the 3+ game matrix gate.`,
      },
      refs: updatedRefs,
    },
    gameCount: logs.games.length,
    refCount: updatedRefs.length,
    teamStatsPairs,
    qualifiedPairs,
  };
}
