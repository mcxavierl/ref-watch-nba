import { getCachedGameLogs } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import {
  atsCoverRateFromRecord,
  hasClosingSpreadLine,
  teamAtsResult,
} from "@/lib/team-ats";
import type {
  RefProfile,
  RefStatsFile,
  RefTeamStat,
  TeamCrewSplit,
} from "@/lib/types";
import type { TeamAtsSampleRecord } from "@/lib/team-ats";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "NBA",
  mlb: "NBA",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function crewKey(officials: { name: string; number: number }[]): string {
  return officials
    .map((official) => refSlug(official.name, official.number))
    .sort()
    .join("|");
}

type AtsCounter = { wins: number; losses: number; pushes: number };

function emptyCounter(): AtsCounter {
  return { wins: 0, losses: 0, pushes: 0 };
}

function addAts(counter: AtsCounter, result: "win" | "loss" | "push"): void {
  if (result === "win") counter.wins += 1;
  else if (result === "loss") counter.losses += 1;
  else counter.pushes += 1;
}

function counterToStat(counter: AtsCounter): Pick<
  RefTeamStat,
  "atsWins" | "atsLosses" | "atsPushes" | "atsGames" | "atsCoverRate"
> {
  const atsGames = counter.wins + counter.losses + counter.pushes;
  return {
    atsWins: counter.wins,
    atsLosses: counter.losses,
    atsPushes: counter.pushes,
    atsGames,
    atsCoverRate: atsCoverRateFromRecord(
      counter.wins,
      counter.losses,
      counter.pushes,
    ),
  };
}


function enrichCacheKey(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): string {
  return [
    leagueId,
    stats.meta.lastUpdated,
    [...scopedSeasons].sort().join(","),
    stats.refs.length,
  ].join("|");
}

/** Attach ref×team and team-baseline ATS from stored game logs when lines exist. */
export function enrichRefStatsForMatrixAts(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  if (!stats.meta.atsAvailable) return stats;

  const cacheKey = enrichCacheKey(leagueId, stats, scopedSeasons);
  const cached = getWorkerIsolateStore().matrixAtsEnrich.get(cacheKey);
  if (cached) return cached;

  const logs = getCachedGameLogs(LEAGUE_ID_TO_DATA[leagueId]);
  if (!logs?.games?.length) return stats;

  const seasonSet = new Set(scopedSeasons);
  const games = logs.games.filter((game) => seasonSet.has(game.season));
  if (games.length === 0) return stats;

  const refTeamAts = new Map<string, Map<string, AtsCounter>>();
  const teamCrewAts = new Map<string, Map<string, AtsCounter>>();
  const teamAtsTotals = new Map<string, AtsCounter>();

  for (const game of games) {
    const hasLine = hasClosingSpreadLine(game);
    if (!hasLine) continue;
    const key = crewKey(game.officials);
    const homeWin = game.homeScore > game.awayScore;

    for (const [teamAbbr, isHome, teamWin] of [
      [game.homeTeam, true, homeWin],
      [game.awayTeam, false, !homeWin],
    ] as const) {
      const ats = teamAtsResult(
        isHome,
        game.homeScore,
        game.awayScore,
        game.homeSpread,
        hasLine,
      );
      if (!ats) continue;

      const crewMap = teamCrewAts.get(teamAbbr) ?? new Map<string, AtsCounter>();
      const crewCounter = crewMap.get(key) ?? emptyCounter();
      addAts(crewCounter, ats);
      crewMap.set(key, crewCounter);
      teamCrewAts.set(teamAbbr, crewMap);

      const teamTotal = teamAtsTotals.get(teamAbbr) ?? emptyCounter();
      addAts(teamTotal, ats);
      teamAtsTotals.set(teamAbbr, teamTotal);

      for (const official of game.officials) {
        const slug = refSlug(official.name, official.number);
        const byTeam = refTeamAts.get(slug) ?? new Map<string, AtsCounter>();
        const teamCounter = byTeam.get(teamAbbr) ?? emptyCounter();
        addAts(teamCounter, ats);
        byTeam.set(teamAbbr, teamCounter);
        refTeamAts.set(slug, byTeam);
      }
    }
  }

  const refs: RefProfile[] = stats.refs.map((ref) => {
    const byTeam = refTeamAts.get(ref.slug);
    if (!ref.teamStats || !byTeam) return ref;

    const teamStats = Object.fromEntries(
      Object.entries(ref.teamStats).map(([teamAbbr, stat]) => {
        const counter = byTeam.get(teamAbbr);
        if (!counter) return [teamAbbr, stat];
        const ats = counterToStat(counter);
        return [
          teamAbbr,
          {
            ...stat,
            ...ats,
          },
        ];
      }),
    );

    return { ...ref, teamStats };
  });

  const teamSplits: Record<string, TeamCrewSplit[]> = { ...stats.teamSplits };
  for (const [teamAbbr, crewMap] of teamCrewAts) {
    const existing = teamSplits[teamAbbr] ?? [];
    if (existing.length === 0) continue;
    teamSplits[teamAbbr] = existing.map((split) => {
      const counter = crewMap.get(split.crewKey);
      if (!counter) return split;
      return { ...split, ...counterToStat(counter) };
    });
  }

  const teamAtsBaselines: Record<string, TeamAtsSampleRecord> = {};
  for (const [teamAbbr, counter] of teamAtsTotals) {
    const ats = counterToStat(counter);
    teamAtsBaselines[teamAbbr] = {
      atsWins: ats.atsWins ?? 0,
      atsLosses: ats.atsLosses ?? 0,
      atsPushes: ats.atsPushes ?? 0,
      atsGames: ats.atsGames ?? 0,
      atsCoverRate: ats.atsCoverRate ?? 0,
    };
  }

  const enriched: RefStatsFile = {
    ...stats,
    refs,
    teamSplits,
    teamAtsBaselines,
  };
  getWorkerIsolateStore().matrixAtsEnrich.set(cacheKey, enriched);

  refTeamAts.clear();
  teamCrewAts.clear();
  teamAtsTotals.clear();

  return enriched;
}

export function prepareStatsForMatrix(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  return enrichRefStatsForMatrixAts(leagueId, stats, scopedSeasons);
}
