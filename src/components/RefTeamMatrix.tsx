"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { winRateTone } from "@/lib/metricTone";
import {
  formatMatrixTeamBaseline,
  matrixCellAriaLabel,
  matrixCellExtreme,
  matrixCellKey,
  MATRIX_REF_SORT_OPTIONS,
  refMatrixAggregate,
  sortMatrixRefs,
  type MatrixRefSort,
  type RefTeamMatrix,
} from "@/lib/ref-team-matrix";
import { formatPct, formatWinRateVsTeam } from "@/lib/stats-utils";
import { winRateDeltaPoints } from "@/lib/teamRecord";

type RefTeamMatrixProps = {
  matrix: RefTeamMatrix;
  basePath: string;
  leagueLabel: string;
  officialNounPlural: string;
  sport: "nba" | "nhl";
};

function cellToneClass(tone: "positive" | "negative" | "neutral"): string {
  switch (tone) {
    case "positive":
      return "ref-matrix-cell--positive";
    case "negative":
      return "ref-matrix-cell--negative";
    default:
      return "ref-matrix-cell--neutral";
  }
}

function extremeClass(extreme: "high" | "low" | null): string {
  if (extreme === "high") return "ref-matrix-cell--extreme-high";
  if (extreme === "low") return "ref-matrix-cell--extreme-low";
  return "";
}

function deltaClass(tone: "positive" | "negative" | "neutral"): string {
  if (tone === "positive") return "ref-matrix-delta--positive";
  if (tone === "negative") return "ref-matrix-delta--negative";
  return "ref-matrix-delta--neutral";
}

export function RefTeamMatrix({
  matrix,
  basePath,
  leagueLabel,
  officialNounPlural,
  sport,
}: RefTeamMatrixProps) {
  const { refs, teams, cells, minGames, qualifiedCellCount } = matrix;
  const [refSort, setRefSort] = useState<MatrixRefSort>("name-asc");
  const sortedRefs = useMemo(
    () => sortMatrixRefs(refs, matrix, refSort),
    [refs, matrix, refSort],
  );
  const sortByWinRate = refSort.startsWith("winRate");
  const officialLabel =
    officialNounPlural.charAt(0).toUpperCase() + officialNounPlural.slice(1);

  return (
    <div className="ref-matrix">
      <div className="ref-matrix-legend" role="note">
        <p className="ref-matrix-legend-copy">
          Each cell shows that ref&apos;s approximate W-L with the team (not the
          team&apos;s overall record). The baseline row under each logo is the
          team&apos;s full sample W-L for coloring only. Cells need {minGames}+
          games; empty cells are below the sample gate. Colors compare ref×team
          win rate to the team baseline; bold borders flag standout splits. Tap a
          cell for that ref&apos;s profile (including tight-game proxy).
          Historical splits only, not picks.
        </p>
        <div className="ref-matrix-legend-swatches" aria-hidden>
          <span className="ref-matrix-swatch ref-matrix-cell--positive">
            Above team baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--neutral">
            Near team baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--negative">
            Below team baseline
          </span>
        </div>
        <div className="ref-matrix-toolbar">
          <p className="ref-matrix-meta">
            {refs.length} {officialNounPlural} × {teams.length} teams ·{" "}
            {qualifiedCellCount} qualified cells
          </p>
          <div className="ref-matrix-sort">
            <label htmlFor="ref-matrix-sort" className="ref-matrix-sort-label">
              Sort rows
            </label>
            <select
              id="ref-matrix-sort"
              value={refSort}
              onChange={(e) => setRefSort(e.target.value as MatrixRefSort)}
              className="ref-matrix-sort-select"
              aria-label={`Sort ${officialNounPlural} by win rate or name`}
            >
              {MATRIX_REF_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="ref-matrix-mobile-hint sm:hidden">
        Scroll horizontally to compare all {leagueLabel} teams. Baseline W-L sits
        under each logo; cell numbers are ref×team splits only.
      </p>

      <div className="ref-matrix-wrap">
        <table className="ref-matrix-table">
          <thead>
            <tr>
              <th scope="col" className="ref-matrix-corner">
                {officialLabel}
              </th>
              {teams.map((team) => (
                <th key={team.abbr} scope="col" className="ref-matrix-team-head">
                  <Link
                    href={`${basePath}/teams/${team.abbr}`}
                    className="ref-matrix-team-link"
                    title={`${team.label} · team sample baseline ${formatMatrixTeamBaseline(team)}`}
                    aria-label={`${team.label}, team sample baseline ${team.baselineWins}-${team.baselineLosses}`}
                  >
                    <TeamLogo
                      team={{
                        abbr: team.abbr,
                        name: team.name,
                        nbaId: team.nbaId,
                      }}
                      sport={sport}
                      size="md"
                      className="ref-matrix-team-logo"
                    />
                  </Link>
                </th>
              ))}
            </tr>
            <tr className="ref-matrix-baseline-row">
              <th scope="row" className="ref-matrix-baseline-corner">
                Team baseline
              </th>
              {teams.map((team) => (
                <td
                  key={team.abbr}
                  className="ref-matrix-baseline-cell"
                  title={`${team.label} sample baseline: ${formatMatrixTeamBaseline(team)}`}
                >
                  <span className="ref-matrix-baseline-record">
                    {team.baselineWins}-{team.baselineLosses}
                  </span>
                  <span className="ref-matrix-baseline-meta">
                    {formatPct(team.baselineWinRate)}
                  </span>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRefs.map((ref) => {
              const aggregate = sortByWinRate
                ? refMatrixAggregate(matrix, ref.slug)
                : null;

              return (
                <tr key={ref.slug}>
                  <th scope="row" className="ref-matrix-ref-head">
                    <Link
                      href={`${basePath}/refs/${ref.slug}`}
                      className="ref-matrix-ref-link"
                      title={
                        aggregate?.weightedWinRate != null
                          ? `${ref.name}: ${formatPct(aggregate.weightedWinRate)} weighted win rate across ${aggregate.qualifiedCells} qualified matchups (${aggregate.qualifiedGames} gp)`
                          : ref.name
                      }
                    >
                      <RefAvatar
                        name={ref.name}
                        slug={ref.slug}
                        sport={sport}
                        size="sm"
                        className="ref-matrix-ref-avatar"
                      />
                      <span className="ref-matrix-ref-name-wrap">
                        <span className="ref-matrix-ref-name">{ref.name}</span>
                        {aggregate?.weightedWinRate != null && (
                          <span className="ref-matrix-ref-aggregate">
                            {formatPct(aggregate.weightedWinRate)} ·{" "}
                            {aggregate.qualifiedGames} gp
                          </span>
                        )}
                      </span>
                    </Link>
                  </th>
                  {teams.map((team) => {
                    const cell = cells[matrixCellKey(ref.slug, team.abbr)];
                    if (!cell) {
                      return (
                        <td
                          key={team.abbr}
                          className="ref-matrix-cell ref-matrix-cell--empty"
                          aria-label={`${ref.name} vs ${team.abbr}: insufficient sample`}
                        >
                          <span aria-hidden>-</span>
                        </td>
                      );
                    }

                    const deltaPts = winRateDeltaPoints(
                      cell.winRate,
                      team.baselineWinRate,
                    );
                    const tone = winRateTone(cell.winRate, team.baselineWinRate);
                    const extreme = matrixCellExtreme(cell, team.baselineWinRate);
                    const record = `${cell.wins}-${cell.losses}`;
                    const ariaLabel = matrixCellAriaLabel(
                      ref.name,
                      team,
                      cell,
                      deltaPts,
                    );

                    return (
                      <td
                        key={team.abbr}
                        className={`ref-matrix-cell ${cellToneClass(tone)} ${extremeClass(extreme)}`.trim()}
                      >
                        <Link
                          href={`${basePath}/refs/${ref.slug}#close-game`}
                          className="ref-matrix-cell-link"
                          title={ariaLabel}
                          aria-label={ariaLabel}
                        >
                          <span className="ref-matrix-record">{record}</span>
                          <span
                            className={`ref-matrix-delta ${deltaClass(tone)}`}
                          >
                            {formatWinRateVsTeam(
                              cell.winRate,
                              team.baselineWinRate,
                            )}
                          </span>
                          <span className="ref-matrix-games">{cell.games} gp</span>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
