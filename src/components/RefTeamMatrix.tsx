"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import {
  formatMatrixTeamBaseline,
  matrixCellAriaLabel,
  matrixCellKey,
  matrixCellStyle,
  MATRIX_DEFAULT_REF_SORT,
  MATRIX_EXTREME_DELTA_PTS,
  MATRIX_REF_SORT_OPTIONS,
  MATRIX_STANDOUT_SORT_EXPLAINER,
  MATRIX_TONE_DELTA_PTS,
  sortMatrixRefs,
  topRefsBeatingBaselineForTeam,
  type MatrixRefSort,
  type RefTeamMatrix,
} from "@/lib/ref-team-matrix";
import { formatPct, formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";

type RefTeamMatrixProps = {
  matrix: RefTeamMatrix;
  basePath: string;
  leagueLabel: string;
  officialNounPlural: string;
  sport: "nba" | "nhl";
};

type MatrixCrosshair = {
  refSlug: string;
  teamAbbr: string;
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

function colCrosshairClass(
  teamAbbr: string,
  crosshair: MatrixCrosshair | null,
): string {
  return crosshair?.teamAbbr === teamAbbr
    ? " ref-matrix-col-track--active"
    : "";
}

export function RefTeamMatrix({
  matrix,
  basePath,
  leagueLabel,
  officialNounPlural,
  sport,
}: RefTeamMatrixProps) {
  const { refs, teams, cells, minGames, qualifiedCellCount } = matrix;
  const [selectedTeamAbbr, setSelectedTeamAbbr] = useState<string | null>(null);
  const [refSort, setRefSort] = useState<MatrixRefSort>(MATRIX_DEFAULT_REF_SORT);
  const [crosshair, setCrosshair] = useState<MatrixCrosshair | null>(null);
  const sortedRefs = useMemo(
    () => sortMatrixRefs(refs, matrix, refSort),
    [refs, matrix, refSort],
  );
  const selectedTeam = useMemo(
    () =>
      selectedTeamAbbr
        ? teams.find((team) => team.abbr === selectedTeamAbbr) ?? null
        : null,
    [selectedTeamAbbr, teams],
  );
  const topRefsForTeam = useMemo(
    () =>
      selectedTeamAbbr
        ? topRefsBeatingBaselineForTeam(matrix, selectedTeamAbbr)
        : [],
    [matrix, selectedTeamAbbr],
  );
  const officialLabel =
    officialNounPlural.charAt(0).toUpperCase() + officialNounPlural.slice(1);

  function toggleTeamFilter(teamAbbr: string) {
    setSelectedTeamAbbr((current) => (current === teamAbbr ? null : teamAbbr));
  }

  function clearTeamFilter() {
    setSelectedTeamAbbr(null);
  }

  function activateCrosshair(refSlug: string, teamAbbr: string) {
    setCrosshair({ refSlug, teamAbbr });
  }

  function clearCrosshair() {
    setCrosshair(null);
  }

  return (
    <div className="ref-matrix">
      <div className="ref-matrix-legend" role="note">
        <p className="ref-matrix-legend-copy">
          Each cell shows that ref&apos;s approximate W-L with the team (not the
          team&apos;s overall record). The baseline row under each logo is the
          team&apos;s full sample W-L for coloring only. Cells need {minGames}+
          games; empty cells are below the sample gate. Text color and a light
          tint compare ref×team win rate to the team baseline (±
          {MATRIX_TONE_DELTA_PTS} pts); splits at ±{MATRIX_EXTREME_DELTA_PTS}{" "}
          pts or more are standout outliers. Delta text and W-L are shown in
          every cell — not color alone. Click a team logo to rank refs who beat
          that team&apos;s baseline; tap a cell for that ref&apos;s profile
          (including tight-game proxy). Historical splits only, not picks.
        </p>
        <div className="ref-matrix-legend-swatches" aria-hidden>
          <span className="ref-matrix-swatch ref-matrix-cell--positive">
            +{MATRIX_TONE_DELTA_PTS}+ pts above baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--neutral">
            Within ±{MATRIX_TONE_DELTA_PTS} pts
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--negative">
            −{MATRIX_TONE_DELTA_PTS}+ pts below baseline
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--positive ref-matrix-cell--extreme-high">
            Standout high (±{MATRIX_EXTREME_DELTA_PTS}+ pts)
          </span>
          <span className="ref-matrix-swatch ref-matrix-cell--negative ref-matrix-cell--extreme-low">
            Standout low (±{MATRIX_EXTREME_DELTA_PTS}+ pts)
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
              aria-label={`Sort ${officialNounPlural} rows`}
              aria-describedby={
                refSort === "standout-desc" ? "ref-matrix-standout-explainer" : undefined
              }
            >
              {MATRIX_REF_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {refSort === "standout-desc" ? (
              <p
                id="ref-matrix-standout-explainer"
                className="ref-matrix-sort-explainer"
              >
                {MATRIX_STANDOUT_SORT_EXPLAINER}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="ref-matrix-mobile-hint sm:hidden">
        Scroll horizontally to compare all {leagueLabel} teams. Baseline W-L sits
        under each logo; cell numbers are ref×team splits only.
      </p>

      <div className="ref-matrix-wrap" onMouseLeave={clearCrosshair}>
        <table className="ref-matrix-table">
          <thead>
            <tr className="ref-matrix-logo-row">
              <th scope="col" className="ref-matrix-corner">
                {officialLabel}
              </th>
              {teams.map((team) => {
                const isSelected = selectedTeamAbbr === team.abbr;
                return (
                  <th
                    key={team.abbr}
                    scope="col"
                    className={`ref-matrix-team-head${isSelected ? " ref-matrix-team-head--selected" : ""}${colCrosshairClass(team.abbr, crosshair)}`}
                  >
                    <button
                      type="button"
                      className={`ref-matrix-team-button${isSelected ? " ref-matrix-team-button--selected" : ""}`}
                      onClick={() => toggleTeamFilter(team.abbr)}
                      onMouseEnter={() => activateCrosshair("", team.abbr)}
                      title={`${team.label} · team sample baseline ${formatMatrixTeamBaseline(team)}${isSelected ? " · clear filter" : " · show top refs above baseline"}`}
                      aria-pressed={isSelected}
                      aria-label={`${team.label}, team sample baseline ${team.baselineWins}-${team.baselineLosses}${isSelected ? ", filter active, click to clear" : ", click to show refs above baseline"}`}
                    >
                      <TeamLogo
                        team={{
                          abbr: team.abbr,
                          name: team.name,
                          nbaId: team.nbaId,
                        }}
                        sport={sport}
                        size="xl"
                        className="ref-matrix-team-logo"
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
            <tr className="ref-matrix-baseline-row">
              <th scope="row" className="ref-matrix-baseline-corner">
                Team baseline
              </th>
              {teams.map((team) => {
                const isSelected = selectedTeamAbbr === team.abbr;
                return (
                  <td
                    key={team.abbr}
                    className={`ref-matrix-baseline-cell${isSelected ? " ref-matrix-baseline-cell--selected" : ""}${colCrosshairClass(team.abbr, crosshair)}`}
                    title={`${team.label} sample baseline: ${formatMatrixTeamBaseline(team)}`}
                    onMouseEnter={() => activateCrosshair("", team.abbr)}
                  >
                    <span className="ref-matrix-baseline-record">
                      {team.baselineWins}-{team.baselineLosses}
                    </span>
                    <span className="ref-matrix-baseline-meta">
                      {formatPct(team.baselineWinRate)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRefs.map((ref) => {
              const rowActive = crosshair?.refSlug === ref.slug;
              return (
                <tr
                  key={ref.slug}
                  className={rowActive ? "ref-matrix-row--crosshair" : undefined}
                >
                  <th
                    scope="row"
                    className={`ref-matrix-ref-head${rowActive ? " ref-matrix-row-track--active" : ""}`}
                    onMouseEnter={() =>
                      activateCrosshair(ref.slug, crosshair?.teamAbbr ?? "")
                    }
                  >
                    <Link
                      href={`${basePath}/refs/${ref.slug}`}
                      className="ref-matrix-ref-link"
                      title={ref.name}
                    >
                      <RefAvatar
                        name={ref.name}
                        slug={ref.slug}
                        sport={sport}
                        size="sm"
                        className="ref-matrix-ref-avatar"
                      />
                      <span className="ref-matrix-ref-name">{ref.name}</span>
                    </Link>
                  </th>
                  {teams.map((team) => {
                    const isSelected = selectedTeamAbbr === team.abbr;
                    const colActive = crosshair?.teamAbbr === team.abbr;
                    const isCrosshairCell =
                      crosshair?.refSlug === ref.slug &&
                      crosshair?.teamAbbr === team.abbr;
                    const trackClass = [
                      colActive ? "ref-matrix-col-track--active" : "",
                      rowActive ? "ref-matrix-row-track--active" : "",
                      isCrosshairCell ? "ref-matrix-cell--crosshair" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const cell = cells[matrixCellKey(ref.slug, team.abbr)];
                    if (!cell) {
                      return (
                        <td
                          key={team.abbr}
                          className={`ref-matrix-cell ref-matrix-cell--empty${isSelected ? " ref-matrix-cell--team-selected" : ""}${trackClass ? ` ${trackClass}` : ""}`.trim()}
                          aria-label={`${ref.name} vs ${team.abbr}: insufficient sample`}
                          onMouseEnter={() =>
                            activateCrosshair(ref.slug, team.abbr)
                          }
                        >
                          <span aria-hidden>-</span>
                        </td>
                      );
                    }

                    const { tone, extreme, deltaPts } = matrixCellStyle(
                      cell,
                      team.baselineWinRate,
                    );
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
                        className={`ref-matrix-cell ${cellToneClass(tone)} ${extremeClass(extreme)}${isSelected ? " ref-matrix-cell--team-selected" : ""}${trackClass ? ` ${trackClass}` : ""}`.trim()}
                        onMouseEnter={() =>
                          activateCrosshair(ref.slug, team.abbr)
                        }
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

      {selectedTeam && (
        <section
          className="ref-matrix-team-panel"
          aria-labelledby="ref-matrix-team-panel-title"
        >
          <div className="ref-matrix-team-panel-head">
            <div className="ref-matrix-team-panel-brand">
              <TeamLogo
                team={{
                  abbr: selectedTeam.abbr,
                  name: selectedTeam.name,
                  nbaId: selectedTeam.nbaId,
                }}
                sport={sport}
                size="md"
                className="ref-matrix-team-panel-logo"
              />
              <div className="ref-matrix-team-panel-copy">
                <h3 id="ref-matrix-team-panel-title" className="ref-matrix-team-panel-title">
                  Top {officialNounPlural} for{" "}
                  <Link
                    href={`${basePath}/teams/${selectedTeam.abbr}`}
                    className="ref-matrix-team-panel-team-link"
                  >
                    {selectedTeam.label}
                  </Link>
                </h3>
                <p className="ref-matrix-team-panel-lead">
                  Better than {selectedTeam.baselineWins}-{selectedTeam.baselineLosses}{" "}
                  baseline ({formatPct(selectedTeam.baselineWinRate)} across{" "}
                  {selectedTeam.baselineGames} gp). Ranked by win-rate delta vs
                  baseline; {minGames}+ games required.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ref-matrix-team-panel-close"
              onClick={clearTeamFilter}
              aria-label={`Clear ${selectedTeam.label} filter`}
            >
              ×
            </button>
          </div>

          {topRefsForTeam.length > 0 ? (
            <ol className="ref-matrix-team-panel-list">
              {topRefsForTeam.map((entry, index) => (
                <li key={entry.refSlug} className="ref-matrix-team-panel-item">
                  <span className="ref-matrix-team-panel-rank" aria-hidden>
                    {index + 1}
                  </span>
                  <Link
                    href={`${basePath}/refs/${entry.refSlug}#close-game`}
                    className="ref-matrix-team-panel-ref"
                  >
                    <RefAvatar
                      name={entry.refName}
                      slug={entry.refSlug}
                      sport={sport}
                      size="sm"
                      className="ref-matrix-team-panel-ref-avatar"
                    />
                    <span>{entry.refName}</span>
                  </Link>
                  <span className="ref-matrix-team-panel-record">
                    {entry.wins}-{entry.losses}
                  </span>
                  <span className="ref-matrix-team-panel-games">
                    {entry.games} gp
                  </span>
                  <span className="ref-matrix-team-panel-delta ref-matrix-delta--positive">
                    {formatSigned(entry.deltaPts)} pts
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ref-matrix-team-panel-empty">
              No qualified {officialNounPlural} beat {selectedTeam.label}&apos;s
              baseline in this sample.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
