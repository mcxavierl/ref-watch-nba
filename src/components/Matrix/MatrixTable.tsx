"use client";

import { useMemo, useState } from "react";
import { TermHelp } from "@/components/TermHelp";
import { MatrixRow } from "@/components/analytics/MatrixRow";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  formatMatrixFoulRatio,
  MATRIX_FOUL_RATIO_TOOLTIP,
  matrixRowHasFoulMetrics,
  sortMatrixTableRows,
  type MatrixRowData,
  type MatrixTableSort,
} from "@/lib/league-matrix-data";
import type { LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";

export type MatrixTableProps = {
  rows: MatrixRowData[];
  sport: LeagueMatrixSport;
  teamLabel: string;
  teamBaselineLabel?: string;
  emptyMessage?: string;
  onReset?: () => void;
  /** Show subjective/admin foul columns when row data includes metrics. */
  showFoulColumns?: boolean;
};

function foulColumnsVisible(
  rows: MatrixRowData[],
  showFoulColumns?: boolean,
): boolean {
  if (showFoulColumns === false) return false;
  return rows.some(matrixRowHasFoulMetrics);
}

function RatioSortButton({
  sort,
  onSort,
}: {
  sort: MatrixTableSort;
  onSort: (next: MatrixTableSort) => void;
}) {
  const isDesc = sort === "foulRatio-desc";
  const isAsc = sort === "foulRatio-asc";

  return (
    <span className="matrix-table-sort-group shrink-0">
      <button
        type="button"
        className={`matrix-table-sort-btn${isDesc ? " matrix-table-sort-btn--active" : ""}`}
        aria-pressed={isDesc}
        aria-label="Sort by foul ratio, highest first"
        onClick={() => onSort(isDesc ? "default" : "foulRatio-desc")}
      >
        ↓
      </button>
      <button
        type="button"
        className={`matrix-table-sort-btn${isAsc ? " matrix-table-sort-btn--active" : ""}`}
        aria-pressed={isAsc}
        aria-label="Sort by foul ratio, lowest first"
        onClick={() => onSort(isAsc ? "default" : "foulRatio-asc")}
      >
        ↑
      </button>
    </span>
  );
}

function FoulRatioBar({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.max(8, ratio * 50));
  return (
    <span className="matrix-foul-ratio-bar" aria-hidden>
      <span className="matrix-foul-ratio-bar-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function MatrixTable({
  rows,
  sport,
  teamLabel,
  teamBaselineLabel,
  emptyMessage,
  onReset,
  showFoulColumns,
}: MatrixTableProps) {
  const [sort, setSort] = useState<MatrixTableSort>("default");
  const foulVisible = foulColumnsVisible(rows, showFoulColumns);

  const sortedRows = useMemo(
    () => sortMatrixTableRows(rows, sort),
    [rows, sort],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        message={emptyMessage ?? "No data available for this range"}
        onReset={onReset}
      />
    );
  }

  return (
    <div className="team-ref-matrix-table analytics-matrix-view matrix-table stat-data-container master-table-scroll">
      <div
        className={`team-ref-matrix-head analytics-matrix-head matrix-table-head${foulVisible ? " matrix-table-head--fouls" : ""}`}
        aria-hidden
      >
        <span className="team-ref-matrix-head-rank">#</span>
        <span className="team-ref-matrix-head-expand master-table-head-expand" aria-hidden />
        <span className="team-ref-matrix-head-ref truncate">Ref</span>
        <span className="team-ref-matrix-head-stat text-right tabular-nums">Win rate</span>
        <span className="team-ref-matrix-head-stat master-table-head-secondary text-right tabular-nums">
          vs baseline
        </span>
        <span className="team-ref-matrix-head-stat master-table-head-secondary text-right tabular-nums">
          Close games
        </span>
        <span className="team-ref-matrix-head-stat master-table-head-secondary text-right tabular-nums">
          <TermHelp id="foul-edge">Whistle diff</TermHelp>
        </span>
        {foulVisible ? (
          <>
            <span className="team-ref-matrix-head-stat master-table-head-secondary text-right tabular-nums">
              Subj. fouls
            </span>
            <span className="team-ref-matrix-head-stat master-table-head-secondary text-right tabular-nums">
              Admin fouls
            </span>
            <span
              className="team-ref-matrix-head-stat master-table-head-secondary matrix-table-head-ratio text-right tabular-nums"
              title={MATRIX_FOUL_RATIO_TOOLTIP}
            >
              <span className="matrix-table-head-ratio-label truncate">
                <TermHelp id="foul-ratio">{MATRIX_FOUL_RATIO_TOOLTIP}</TermHelp>
                Ratio
              </span>
              <RatioSortButton sort={sort} onSort={setSort} />
            </span>
          </>
        ) : null}
      </div>
      <ol className="team-ref-matrix-list analytics-matrix-list">
        {sortedRows.map((row, index) => (
          <MatrixRow
            key={row.refSlug}
            rank={index + 1}
            refSlug={row.refSlug}
            refName={row.refName}
            winRate={row.winRate}
            variance={row.variance}
            closeGameStats={row.closeGameStats}
            whistleDiff={row.whistleDiff}
            refProfileLink={row.refProfileLink}
            sport={sport}
            winRateTone={row.winRateTone}
            whistleTone={row.whistleTone}
            baselineTitle={
              teamBaselineLabel
                ? `Win rate vs team baseline (${teamBaselineLabel})`
                : undefined
            }
            subjectiveFouls={foulVisible ? row.subjectiveFouls : undefined}
            adminFouls={foulVisible ? row.adminFouls : undefined}
            foulRatio={foulVisible ? row.foulRatio : undefined}
            foulRatioLabel={formatMatrixFoulRatio(row.foulRatio)}
            foulRatioBar={
              row.foulRatio != null && Number.isFinite(row.foulRatio) ? (
                <FoulRatioBar ratio={row.foulRatio} />
              ) : null
            }
          />
        ))}
      </ol>
    </div>
  );
}
