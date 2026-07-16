import { dataLeagueTenSeasons, DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import {
  atsFieldsFromStat,
  getTeamAtsSampleRecord,
} from "@/lib/team-ats";
import { getTeamDisplayRecord } from "@/lib/teamRecord";
import { teamWhistleEdge } from "@/lib/stats-utils";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type { RefStatsFile, TeamCrewSplit } from "@/lib/types";
import {
  MATRIX_MIN_GAMES,
  matrixCellKey,
  resolveMatrixTeamSplits,
  teamRecordFromStat,
  type RefTeamMatrix,
  type RefTeamMatrixCell,
  type RefTeamMatrixOptions,
  type RefTeamMatrixRef,
  type RefTeamMatrixTeam,
} from "@/lib/ref-team-matrix";

function matrixComputeCache(): Map<string, unknown> {
  return getWorkerIsolateStore().matrixCompute;
}

export function computeRefTeamMatrix(
  stats: RefStatsFile,
  teamList: { abbr: string; label: string; name: string; nbaId?: number }[],
  getTeamSplits: (abbr: string) => TeamCrewSplit[],
  minGames = MATRIX_MIN_GAMES,
  matrixOptions: RefTeamMatrixOptions = {},
): RefTeamMatrix {
  const league = matrixOptions.league ?? "nba";
  const sinceSeason = matrixOptions.sinceSeason ?? DEFAULT_SINCE_SEASON;
  const cacheKey = [
    league,
    sinceSeason,
    minGames,
    matrixOptions.filterEmptyRows ? 1 : 0,
    stats.refs.length,
    teamList.length,
    stats.meta.lastUpdated,
    stats.refs.reduce((sum, ref) => sum + ref.games, 0),
  ].join("|");
  const cached = matrixComputeCache().get(cacheKey) as RefTeamMatrix | undefined;
  if (cached) return cached;

  const recordSeasons =
    stats.meta.seasons.length === 0
      ? [...dataLeagueTenSeasons(
          league === "nba"
            ? "NBA"
            : league === "nhl"
              ? "NHL"
              : league === "nfl"
                ? "NFL"
                : league === "epl"
                  ? "EPL"
                  : league === "laliga"
                    ? "LALIGA"
                    : league === "cbb"
                      ? "CBB"
                      : "CFB",
        )]
      : stats.meta.seasons;

  const teams: RefTeamMatrixTeam[] = teamList.map((team) => {
    const abbr = team.abbr.toUpperCase();
    const splits = resolveMatrixTeamSplits(stats, team.abbr, getTeamSplits);
    const record = getTeamDisplayRecord(league, abbr, splits, recordSeasons, {
      sinceSeason,
    });
    const atsRecord =
      stats.teamAtsBaselines?.[abbr] ?? getTeamAtsSampleRecord(splits);
    return {
      abbr: team.abbr,
      label: team.label,
      name: team.name,
      nbaId: team.nbaId,
      baselineWins: record.wins,
      baselineLosses: record.losses,
      baselineGames: record.games,
      baselineWinRate: record.winRate,
      baselineAtsWins: atsRecord.atsWins,
      baselineAtsLosses: atsRecord.atsLosses,
      baselineAtsPushes: atsRecord.atsPushes,
      baselineAtsGames: atsRecord.atsGames,
      baselineAtsCoverRate: atsRecord.atsCoverRate,
    };
  });

  const refs: RefTeamMatrixRef[] = stats.refs
    .filter((ref) => ref.teamStats && Object.keys(ref.teamStats).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((ref) => ({
      slug: ref.slug,
      name: ref.name,
      number: ref.number,
    }));

  const cells: Record<string, RefTeamMatrixCell> = {};
  let qualifiedCellCount = 0;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [teamAbbr, stat] of Object.entries(ref.teamStats)) {
      if (stat.games < 1) continue;
      const { wins, losses } = teamRecordFromStat(stat);
      const ats = atsFieldsFromStat(stat);
      const thinSample = stat.games < minGames;
      cells[matrixCellKey(ref.slug, teamAbbr)] = {
        refSlug: ref.slug,
        teamAbbr: teamAbbr.toUpperCase(),
        games: stat.games,
        wins,
        losses,
        winRate: stat.winRate,
        atsWins: ats.atsWins,
        atsLosses: ats.atsLosses,
        atsPushes: ats.atsPushes,
        atsGames: ats.atsGames,
        atsCoverRate: ats.atsCoverRate,
        avgFoulDifferential: teamWhistleEdge(stat.avgFoulDifferential),
        thinSample,
      };
      if (!thinSample) qualifiedCellCount++;
    }
  }

  const visibleRefs = matrixOptions.filterEmptyRows
    ? refs.filter((ref) =>
        teams.some(
          (team) => cells[matrixCellKey(ref.slug, team.abbr)] !== undefined,
        ),
      )
    : refs;

  const result: RefTeamMatrix = {
    refs: visibleRefs,
    teams,
    cells,
    minGames,
    qualifiedCellCount,
  };
  matrixComputeCache().set(cacheKey, result);
  return result;
}
