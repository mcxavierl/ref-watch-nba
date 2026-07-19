"use client";

import { TermHelp } from "@/components/TermHelp";
import { MatrixRow } from "@/components/analytics/MatrixRow";
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
          className={`team-ref-filter-btn${value === mode ? " team-ref-filter-btn--active" : ""}`}
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
}: {
  rows: MatrixRowData[];
  sport: LeagueMatrixSport;
  teamLabel: string;
  teamBaselineLabel?: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        {emptyMessage ?? `No qualified refs in this view for ${teamLabel} yet.`}
      </p>
    );
  }

  return (
    <div className="team-ref-matrix-table analytics-matrix-view">
      <div className="team-ref-matrix-head analytics-matrix-head" aria-hidden>
        <span className="team-ref-matrix-head-rank">#</span>
        <span className="team-ref-matrix-head-ref">Ref</span>
        <span className="team-ref-matrix-head-stat">Win rate</span>
        <span className="team-ref-matrix-head-stat">vs baseline</span>
        <span className="team-ref-matrix-head-stat">Close games</span>
        <span className="team-ref-matrix-head-stat">
          <TermHelp id="foul-edge">Whistle diff</TermHelp>
        </span>
      </div>
      <ol className="team-ref-matrix-list analytics-matrix-list">
        {rows.map((row, index) => (
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
          />
        ))}
      </ol>
    </div>
  );
}
