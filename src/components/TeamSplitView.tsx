"use client";

import { TeamRefSortBar } from "@/components/TeamRefSortBar";
import { MatrixFilterBar, MatrixView } from "@/components/analytics/MatrixView";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeagueMatrixData, type LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";
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
  closeGamesByRef = {},
}: {
  refSplits: TeamRefLeaderboardEntry[];
  teamAbbr: string;
  teamLabel: string;
  teamRecord: TeamSampleRecord;
  basePath?: string;
  sport?: LeagueMatrixSport;
  dataLeague?: DataLeague;
  closeGamesByRef?: Record<string, TeamRefCloseGamesStat>;
}) {
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
      />
    </>
  );
}
