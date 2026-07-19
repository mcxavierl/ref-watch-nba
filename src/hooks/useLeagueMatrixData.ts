"use client";

import { useMemo, useState } from "react";
import type { DataLeague } from "@/lib/game-logs-preload";
import {
  resolveLeagueMatrixRows,
  type LeagueMatrixFilter,
  type MatrixRowData,
} from "@/lib/league-matrix-data";
import type { TeamRefCloseGamesStat } from "@/lib/team-ref-close-games-display";
import type { TeamRefLeaderboardEntry, TeamRefSort } from "@/lib/teamRefLeaderboards";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export type LeagueMatrixSport =
  | "nba"
  | "nhl"
  | "nfl"
  | "epl"
  | "laliga"
  | "cbb"
  | "cfb";

export type UseLeagueMatrixDataInput = {
  /** Team abbreviation (e.g. ANA, LAL). */
  teamAbbr: string;
  refEntries: TeamRefLeaderboardEntry[];
  teamRecord: TeamSampleRecord;
  teamLabel: string;
  closeGamesByRef: Record<string, TeamRefCloseGamesStat>;
  dataLeague: DataLeague;
  basePath: string;
  sport: LeagueMatrixSport;
};

export function useLeagueMatrixData({
  teamAbbr,
  refEntries,
  teamRecord,
  teamLabel,
  closeGamesByRef,
  dataLeague,
  basePath,
}: UseLeagueMatrixDataInput) {
  const [filterMode, setFilterMode] = useState<LeagueMatrixFilter>("all");
  const [sort, setSort] = useState<TeamRefSort>("winRate-desc");

  const rows = useMemo(
    () =>
      resolveLeagueMatrixRows(
        refEntries,
        filterMode,
        sort,
        teamRecord,
        teamLabel,
        closeGamesByRef,
        dataLeague,
        basePath,
      ),
    [
      refEntries,
      filterMode,
      sort,
      teamRecord,
      teamLabel,
      closeGamesByRef,
      dataLeague,
      basePath,
    ],
  );

  return {
    teamAbbr,
    filterMode,
    setFilterMode,
    sort,
    setSort,
    rows,
    isTopTenView: filterMode !== "all",
  } satisfies {
    teamAbbr: string;
    filterMode: LeagueMatrixFilter;
    setFilterMode: (mode: LeagueMatrixFilter) => void;
    sort: TeamRefSort;
    setSort: (sort: TeamRefSort) => void;
    rows: MatrixRowData[];
    isTopTenView: boolean;
  };
}

export type { LeagueMatrixFilter, MatrixRowData };
