"use client";

import { useState } from "react";
import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { MatrixFilterBar, MatrixView } from "@/components/analytics/MatrixView";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  RefTeamMatchupGamesModal,
  type RefTeamMatchupTarget,
} from "@/components/RefTeamMatchupGamesModal";
import { useLeagueMatrixData, type LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";
import type { MatrixRowData } from "@/lib/league-matrix-data";
import type { LeagueId } from "@/lib/leagues";
import { formatPct } from "@/lib/stats-utils";
import type { TeamRefLeaderboardEntry } from "@/lib/teamRefLeaderboards";
import type { TeamRefCloseGamesStat } from "@/lib/team-ref-close-games-display";
import type { DataLeague } from "@/lib/game-logs-preload";
import type { TeamSampleRecord } from "@/lib/teamRecord";

export function TeamSplitView({
  refSplits,
  teamAbbr,
  teamLabel,
  teamRecord,
  basePath = "",
  sport = "nba",
  dataLeague = "NBA",
  leagueId = "nba",
  closeGamesByRef = {},
}: {
  refSplits: TeamRefLeaderboardEntry[];
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  basePath?: string;
  sport?: LeagueMatrixSport;
  dataLeague?: DataLeague;
  leagueId?: LeagueId;
  closeGamesByRef?: Record<string, TeamRefCloseGamesStat>;
}) {
  const [matchupDrilldown, setMatchupDrilldown] =
    useState<RefTeamMatchupTarget | null>(null);
  const [matchupModalOpen, setMatchupModalOpen] = useState(false);

  const matrix = useLeagueMatrixData({
    teamAbbr,
    refEntries: refSplits,
    teamRecord,
    teamLabel,
    closeGamesByRef,
    dataLeague,
    basePath,
    sport,
  });

  const teamBaselineLabel =
    teamRecord.games > 0 ? formatPct(teamRecord.winRate) : undefined;

  function openMatchupDrilldown(row: MatrixRowData) {
    setMatchupDrilldown({
      leagueId,
      refSlug: row.refSlug,
      refName: row.refName,
      teamAbbr,
      teamLabel,
      baselineWinRate: teamRecord.winRate,
    });
    setMatchupModalOpen(true);
  }

  if (refSplits.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <MatrixFilterBar
          value={matrix.filterMode}
          onChange={matrix.setFilterMode}
        />
        {!matrix.isTopTenView ? (
          <TeamRefSortBar
            value={matrix.sort}
            onChange={matrix.setSort}
            id="team-ref-cards-sort"
          />
        ) : null}
      </div>
      <MatrixView
        rows={matrix.rows}
        sport={sport}
        teamLabel={teamLabel}
        teamBaselineLabel={teamBaselineLabel}
        onReset={() => matrix.setFilterMode("all")}
        onOpenGames={openMatchupDrilldown}
      />
      <RefTeamMatchupGamesModal
        target={matchupDrilldown}
        open={matchupModalOpen}
        onClose={() => setMatchupModalOpen(false)}
      />
    </>
  );
}
