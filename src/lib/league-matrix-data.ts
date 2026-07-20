import type { DataLeague } from "@/lib/game-logs-preload";
import { winRateTone, foulEdgeTone } from "@/lib/metricTone";
import {
  closeGameMarginThreshold,
  formatTeamRefCloseGamesTooltip,
  type TeamRefCloseGamesStat,
} from "@/lib/team-ref-close-games-display";
import { formatPct, formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import { sortTeamRefEntries } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export type LeagueMatrixFilter = "all" | "favorable" | "unfavorable";

export const LEAGUE_MATRIX_TOP_N = 10;

export type MatrixCloseGameStats = {
  closeCount: number;
  totalGames: number;
  fraction: string;
  definitionTooltip: string;
  detailTooltip?: string;
};

export type MatrixRowData = {
  refSlug: string;
  refName: string;
  winRate: string;
  variance: string;
  winRateTone: "positive" | "negative" | "neutral";
  closeGameStats: MatrixCloseGameStats;
  whistleDiff: string;
  whistleTone: "positive" | "negative" | "neutral";
  refProfileLink: string;
  games: number;
  winRateValue: number;
};

export function leagueMatrixFilterLabel(mode: LeagueMatrixFilter): string {
  switch (mode) {
    case "all":
      return "All";
    case "favorable":
      return "Favorable (Top 10)";
    case "unfavorable":
      return "Unfavorable (Top 10)";
  }
}

export function closeGameDefinitionForLeague(league: DataLeague): string {
  const threshold = closeGameMarginThreshold(league);
  const unit =
    league === "NHL" || league === "EPL" || league === "LALIGA" ? "goals" : "points";
  return `Close games are final margins of ${threshold} ${unit} or less under this ref.`;
}

function resolveCloseGames(
  slug: string,
  entry: TeamRefLeaderboardEntry,
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>,
  teamLabel: string,
  dataLeague: DataLeague,
): MatrixCloseGameStats {
  const stat = closeGamesByRef[slug] ?? {
    closeCount: 0,
    totalGames: entry.games,
    closeGames: [],
  };
  const totalGames = stat.totalGames || entry.games;
  const definitionTooltip = closeGameDefinitionForLeague(dataLeague);
  const detailTooltip = formatTeamRefCloseGamesTooltip(stat, teamLabel, dataLeague);
  const tooltip = detailTooltip
    ? `${definitionTooltip}\n\n${detailTooltip}`
    : definitionTooltip;

  return {
    closeCount: stat.closeCount,
    totalGames,
    fraction: `${stat.closeCount}/${totalGames}`,
    definitionTooltip: tooltip,
    detailTooltip,
  };
}

export function buildMatrixRowData(
  entry: TeamRefLeaderboardEntry,
  teamRecord: TeamSampleRecord,
  teamLabel: string,
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>,
  dataLeague: DataLeague,
  basePath: string,
): MatrixRowData {
  const winTone = winRateTone(entry.winRate, teamRecord.winRate);
  const foulTone = foulEdgeTone(entry.avgFoulDifferential);

  return {
    refSlug: entry.slug,
    refName: entry.name,
    winRate: formatPct(entry.winRate),
    variance: formatWinRateVsTeam(entry.winRate, teamRecord.winRate),
    winRateTone: winTone,
    closeGameStats: resolveCloseGames(
      entry.slug,
      entry,
      closeGamesByRef,
      teamLabel,
      dataLeague,
    ),
    whistleDiff: formatSigned(entry.avgFoulDifferential),
    whistleTone: foulTone,
    refProfileLink: `${basePath}/refs/${entry.slug}`,
    games: entry.games,
    winRateValue: entry.winRate,
  };
}

export function buildMatrixRows(
  entries: TeamRefLeaderboardEntry[],
  teamRecord: TeamSampleRecord,
  teamLabel: string,
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>,
  dataLeague: DataLeague,
  basePath: string,
): MatrixRowData[] {
  return entries.map((entry) =>
    buildMatrixRowData(
      entry,
      teamRecord,
      teamLabel,
      closeGamesByRef,
      dataLeague,
      basePath,
    ),
  );
}

export function filterLeagueMatrixEntries(
  entries: TeamRefLeaderboardEntry[],
  filterMode: LeagueMatrixFilter,
  sort: TeamRefSort,
): TeamRefLeaderboardEntry[] {
  if (filterMode === "all") {
    return sortTeamRefEntries(entries, sort);
  }
  const sorted = [...entries].sort((a, b) =>
    filterMode === "favorable" ? b.winRate - a.winRate : a.winRate - b.winRate,
  );
  return sorted.slice(0, LEAGUE_MATRIX_TOP_N);
}

export function resolveLeagueMatrixRows(
  entries: TeamRefLeaderboardEntry[],
  filterMode: LeagueMatrixFilter,
  sort: TeamRefSort,
  teamRecord: TeamSampleRecord,
  teamLabel: string,
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>,
  dataLeague: DataLeague,
  basePath: string,
): MatrixRowData[] {
  const filtered = filterLeagueMatrixEntries(entries, filterMode, sort);
  return buildMatrixRows(
    filtered,
    teamRecord,
    teamLabel,
    closeGamesByRef,
    dataLeague,
    basePath,
  );
}
