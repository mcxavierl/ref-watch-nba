"use client";

import { MatrixTable } from "@/components/Matrix/MatrixTable";
import {
  leagueMatrixFilterLabel,
  type LeagueMatrixFilter,
} from "@/lib/league-matrix-data";
import type { MatrixRowData } from "@/lib/league-matrix-data";
import type { LeagueMatrixSport } from "@/hooks/useLeagueMatrixData";

export function MatrixFilterBar({
  value,
  onChange,
}: {
  value: LeagueMatrixFilter;
  onChange: (mode: LeagueMatrixFilter) => void;
}) {
  const modes: LeagueMatrixFilter[] = ["all", "favorable", "unfavorable"];

  return (
    <div
      className="team-ref-filter-bar refs-directory-metric-toggle analytics-matrix-filter"
      role="group"
      aria-label="Filter team ref matrix"
    >
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          className={`team-ref-filter-btn whitespace-nowrap px-3${value === mode ? " team-ref-filter-btn--active" : ""}`}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {leagueMatrixFilterLabel(mode)}
        </button>
      ))}
    </div>
  );
}

export function MatrixView({
  rows,
  sport,
  teamLabel,
  teamBaselineLabel,
  emptyMessage,
  onReset,
  showFoulColumns,
}: {
  rows: MatrixRowData[];
  sport: LeagueMatrixSport;
  teamLabel: string;
  teamBaselineLabel?: string;
  emptyMessage?: string;
  onReset?: () => void;
  showFoulColumns?: boolean;
}) {
  return (
    <MatrixTable
      rows={rows}
      sport={sport}
      teamLabel={teamLabel}
      teamBaselineLabel={teamBaselineLabel}
      emptyMessage={emptyMessage}
      onReset={onReset}
      showFoulColumns={showFoulColumns}
    />
  );
}
