import { countRefGamesFromLogsMatching, dedupeByGameId } from "../../../src/lib/game-count";
import type { GameLogEntry } from "../../lib/game-logs";
import { dedupeRefsInPlace } from "../../lib/merge-duplicate-refs";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
  type RefVariant,
} from "../../lib/ref-identity";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../../lib/ref-team-stats";
import { refSlug } from "../../lib/slug";
import { teamWonGame } from "../../lib/team-win";
import { teamFoulsFromGameLog } from "../../../src/lib/team-foul-split";
import type { RefGameRecord, RefProfile, RefStatsFile } from "../../lib/types";

const MIN_SAMPLE = 30;
const RECENT_GAMES_CAP = 80;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildWnbaRefStatsFromLogs(games: GameLogEntry[]): RefStatsFile {
  const refGames = new Map<string, RefGameRecord[]>();
  const refIdentities = new Map<string, Map<number, RefVariant>>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const seenRefGame = new Map<string, Set<string>>();
  const seasonsSeen = new Set<string>();
  let skippedNoOfficials = 0;

  for (const game of games) {
    if (!game.officials?.length) {
      skippedNoOfficials += 1;
      continue;
    }

    seasonsSeen.add(game.season);
    const overHit = game.totalPoints > game.closingTotal;
    const homeWin = game.homeScore > game.awayScore;

    for (const official of game.officials) {
      const officialName = official.name?.trim();
      if (!officialName) continue;

      const refKey = canonicalRefKey(officialName);
      const variants = refIdentities.get(refKey) ?? new Map<number, RefVariant>();
      const variant =
        variants.get(official.number) ??
        { name: officialName, number: official.number, games: 0, lastDate: "" };
      variant.games += 1;
      if (game.date >= variant.lastDate) {
        variant.lastDate = game.date;
        variant.name = officialName;
      }
      variants.set(official.number, variant);
      refIdentities.set(refKey, variants);

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
        raptorsInvolved: game.homeTeam === "TOR" || game.awayTeam === "TOR",
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
          foulDifferential: fouls.teamFouls - fouls.opponentFouls,
          totalPoints: game.totalPoints,
          overHit,
          teamWin,
        });
      }
    }
  }

  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.reduce((sum, row) => sum + row.totalPoints, 0) /
    Math.max(allGameRecords.length, 1);
  const leagueAvgFouls =
    allGameRecords.reduce((sum, row) => sum + row.totalFouls, 0) /
    Math.max(allGameRecords.length, 1);

  const refs: RefProfile[] = [];
  for (const [refKey, gamesForRef] of refGames) {
    const variants = refIdentities.get(refKey);
    if (!variants?.size) continue;

    const identity = chooseRefIdentity(variants.values());
    const displayName = displayNameForKey(refKey, identity.name)?.trim();
    if (!displayName) continue;

    const deduped = dedupeByGameId(gamesForRef);
    const verified = countRefGamesFromLogsMatching(games, (official) =>
      canonicalRefKey(official.name) === refKey,
    );
    const sampleGames = deduped.length > 0 ? deduped : gamesForRef;
    const n = sampleGames.length;
    const avgTotal = sampleGames.reduce((sum, row) => sum + row.totalPoints, 0) / n;
    const avgFouls = sampleGames.reduce((sum, row) => sum + row.totalFouls, 0) / n;
    const overRate = sampleGames.filter((row) => row.overHit).length / n;
    const seasons = [...new Set(sampleGames.map((row) => row.season))].sort();

    refs.push({
      slug: refSlug(displayName, identity.number),
      name: displayName,
      number: identity.number,
      games: verified,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons,
      recentGames: [...sampleGames]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, RECENT_GAMES_CAP),
      teamStats: collectRefTeamStats(refTeamBuckets.get(refKey) ?? new Map()),
    });
  }

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const allDates = games.map((game) => game.date).sort();
  const qualifiedPairs = refs.reduce(
    (sum, ref) =>
      sum + Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3).length,
    0,
  );
  const teamStatsPairs = refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...seasonsSeen].sort(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(leagueAvgTotal),
      minSampleSize: MIN_SAMPLE,
      source: "wnba-stats-api",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: games.length,
      dateRange: {
        earliest: allDates[0] ?? "",
        latest: allDates.at(-1) ?? "",
      },
      note:
        `${games.length} WNBA games from ESPN with scores, foul totals, and referee crews. ` +
        `Matrix: ${qualifiedPairs}/${teamStatsPairs} ref×team pairs with 3+ games. ` +
        `${skippedNoOfficials} games skipped (no officials listed).`,
    },
    refs,
    teamSplits: {},
  };
}
