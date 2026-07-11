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
  MATRIX_DEFAULT_TEAM_PANEL_SORT,
  MATRIX_EXTREME_DELTA_PTS,
  MATRIX_REF_SORT_OPTIONS,
  MATRIX_STANDOUT_SORT_EXPLAINER,
  MATRIX_TONE_DELTA_PTS,
  sortMatrixRefs,
  TEAM_MATRIX_REF_PANEL_LIMIT,
  bottomRefsBelowBaselineForTeam,
  thinSampleRefsForTeam,
  topRefsBeatingBaselineForTeam,
  type MatrixRefSort,
  type MatrixTeamPanelSort,
  type RefTeamMatrix,
  type TeamTopRefEntry,
} from "@/lib/ref-team-matrix";
import { formatPct, formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";
import { foulEdgeTone } from "@/lib/metricTone";
import { TeamRecordSosCard } from "@/components/TeamRecordSosCard";
import type { TeamStrengthOfSchedule } from "@/lib/nba-strength-of-schedule";

type RefTeamMatrixProps = {
  matrix: RefTeamMatrix;
  basePath: string;
  leagueLabel: string;
  officialNounPlural: string;
  whistleDiffLabel: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";
  teamSosByAbbr?: Record<string, TeamStrengthOfSchedule>;
};

function TeamRefRankListItem({
  entry,
  rank,
  variant,
  basePath,
  sport,
  whistleDiffLabel,
  teamBaselineWinRate,
}: {
  entry: TeamTopRefEntry;
  rank: number;
  variant: "positive" | "negative";
  basePath: string;
  sport: RefTeamMatrixProps["sport"];
  whistleDiffLabel: string;
  teamBaselineWinRate: number;
}) {
  const deltaClass =
    variant === "positive"
      ? "ref-matrix-delta--positive"
      : "ref-matrix-delta--negative";
  const foulTone = foulEdgeTone(entry.avgFoulDifferential);
  const foulClass =
    foulTone === "positive"
      ? "ref-matrix-delta--positive"
      : foulTone === "negative"
        ? "ref-matrix-delta--negative"
        : "ref-matrix-delta--neutral";
  const winDeltaLabel = formatWinRateVsTeam(entry.winRate, teamBaselineWinRate);
  const winDeltaShort = winDeltaLabel.replace(/\s+vs team$/i, "");
  const whistleUnit = whistleDiffLabel.replace(/\s+diff$/i, "").toLowerCase();

  return (
    <li className="ref-matrix-team-panel-item">
      <span className="ref-matrix-team-panel-rank" aria-hidden>
        {rank}
      </span>
      <Link
        href={`${basePath}/refs/${entry.refSlug}#close-game`}
        className="ref-matrix-team-panel-ref"
        title={entry.refName}
      >
        <RefAvatar
          name={entry.refName}
          slug={entry.refSlug}
          sport={sport}
          size="sm"
          className="ref-matrix-team-panel-ref-avatar"
        />
        <span className="ref-matrix-team-panel-ref-name">{entry.refName}</span>
      </Link>
      <span className="ref-matrix-team-panel-record">
        <span className="ref-matrix-team-panel-record-line">
          {entry.wins}-{entry.losses}
        </span>
        <span
          className={`ref-matrix-team-panel-win-delta ${deltaClass}`}
          title={`Win rate vs team baseline: ${winDeltaLabel}`}
        >
          {winDeltaShort}
        </span>
      </span>
      <span className="ref-matrix-team-panel-games">{entry.games} gp</span>
      <span
        className={`ref-matrix-team-panel-delta ${foulClass}`}
        title={`${whistleDiffLabel}: ${formatSigned(entry.avgFoulDifferential)} per game`}
      >
        {formatSigned(entry.avgFoulDifferential)} {whistleUnit}
      </span>
    </li>
  );
}

function TeamRefRankColumn({
  titleId,
  title,
  entries,
  variant,
  emptyMessage,
  basePath,
  sport,
  whistleDiffLabel,
  teamBaselineWinRate,
}: {
  titleId: string;
  title: string;
  entries: TeamTopRefEntry[];
  variant: "positive" | "negative";
  emptyMessage: string;
  basePath: string;
  sport: RefTeamMatrixProps["sport"];
  whistleDiffLabel: string;
  teamBaselineWinRate: number;
}) {
  return (
    <div className="ref-matrix-team-panel-column">
      <h4 id={titleId} className="ref-matrix-team-panel-column-title">
        {title}
      </h4>
      {entries.length === 0 ? (
        <p className="ref-matrix-team-panel-empty">{emptyMessage}</p>
      ) : (
        <ul className="ref-matrix-team-panel-list" aria-labelledby={titleId}>
          {entries.slice(0, TEAM_MATRIX_REF_PANEL_LIMIT).map((entry, index) => (
            <TeamRefRankListItem
              key={entry.refSlug}
              entry={entry}
              rank={index + 1}
              variant={variant}
              basePath={basePath}
              sport={sport}
              whistleDiffLabel={whistleDiffLabel}
              teamBaselineWinRate={teamBaselineWinRate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

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
  whistleDiffLabel,
  sport,
  teamSosByAbbr,
}: RefTeamMatrixProps) {
  const { refs, teams, cells, minGames, qualifiedCellCount } = matrix;
  const [selectedTeamAbbr, setSelectedTeamAbbr] = useState<string | null>(null);
  const [refSort, setRefSort] = useState<MatrixRefSort>(MATRIX_DEFAULT_REF_SORT);
  const [teamPanelSort, setTeamPanelSort] = useState<MatrixTeamPanelSort>(
    MATRIX_DEFAULT_TEAM_PANEL_SORT,
  );
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
        ? topRefsBeatingBaselineForTeam(matrix, selectedTeamAbbr, TEAM_MATRIX_REF_PANEL_LIMIT, teamPanelSort)
        : [],
    [matrix, selectedTeamAbbr, teamPanelSort],
  );
  const bottomRefsForTeam = useMemo(
    () =>
      selectedTeamAbbr
        ? bottomRefsBelowBaselineForTeam(matrix, selectedTeamAbbr, TEAM_MATRIX_REF_PANEL_LIMIT, teamPanelSort)
        : [],
    [matrix, selectedTeamAbbr, teamPanelSort],
  );
  const thinRefsForTeam = useMemo(
    () =>
      selectedTeamAbbr ? thinSampleRefsForTeam(matrix, selectedTeamAbbr) : [],
    [matrix, selectedTeamAbbr],
  );
  const officialLabel =
    officialNounPlural.charAt(0).toUpperCase() + officialNounPlural.slice(1);
  const splitNoun =
    sport === "nhl" || sport === "nfl" || sport === "cfb" ? "Official" : "Ref";

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
    <div className="ref-matrix" data-league={sport}>
      <div className="ref-matrix-legend" role="note">
        <p className="ref-matrix-legend-copy">
          Each cell shows that ref&apos;s approximate W-L with the team (not the
          team&apos;s overall record). The baseline row under each logo is the
          team&apos;s full sample W-L for coloring only. Cells need {minGames}+
          games for ranking colors; thinner samples show a muted record. Empty
          cells mean zero games together. Text color and a light
          tint compare ref×team win rate to the team baseline (±
          {MATRIX_TONE_DELTA_PTS} pts); splits at ±{MATRIX_EXTREME_DELTA_PTS}{" "}
          pts or more are standout outliers. Delta text and W-L are shown in
          every cell, not color alone. Click a team logo to rank the top and
          bottom {TEAM_MATRIX_REF_PANEL_LIMIT} refs for that team; tap a cell for that
          ref&apos;s profile (including tight-game proxy). Historical splits
          only, not picks.
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
                      title={`${team.label} · team sample baseline ${formatMatrixTeamBaseline(team)}${isSelected ? " · clear filter" : " · show top and bottom refs for this team"}`}
                      aria-pressed={isSelected}
                      aria-label={`${team.label}, team sample baseline ${team.baselineWins}-${team.baselineLosses}${isSelected ? ", filter active, click to clear" : ", click to show top and bottom refs for this team"}`}
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
                      {team.baselineGames > 0
                        ? `${team.baselineWins}-${team.baselineLosses}`
                        : "—"}
                    </span>
                    <span className="ref-matrix-baseline-meta">
                      {team.baselineGames > 0 ? formatPct(team.baselineWinRate) : "—"}
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
                          aria-label={`${ref.name} vs ${team.abbr}: no games`}
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
                    const ariaLabel = cell.thinSample
                      ? `${ref.name} with ${team.label}: ${record} in ${cell.games} games (below ${minGames}-game sample gate)`
                      : matrixCellAriaLabel(
                          ref.name,
                          team,
                          cell,
                          deltaPts,
                        );

                    return (
                      <td
                        key={team.abbr}
                        className={`ref-matrix-cell ${cell.thinSample ? "ref-matrix-cell--thin" : `${cellToneClass(tone)} ${extremeClass(extreme)}`}${isSelected ? " ref-matrix-cell--team-selected" : ""}${trackClass ? ` ${trackClass}` : ""}`.trim()}
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
                          {cell.thinSample ? (
                            <span className="ref-matrix-delta ref-matrix-delta--thin">
                              thin
                            </span>
                          ) : (
                            <span
                              className={`ref-matrix-delta ${deltaClass(tone)}`}
                            >
                              {formatWinRateVsTeam(
                                cell.winRate,
                                team.baselineWinRate,
                              )}
                            </span>
                          )}
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
                  {splitNoun}×team splits for{" "}
                  <Link
                    href={`${basePath}/teams/${selectedTeam.abbr}`}
                    className="ref-matrix-team-panel-team-link"
                  >
                    {selectedTeam.label}
                  </Link>
                </h3>
                {sport === "nba" &&
                teamSosByAbbr?.[selectedTeam.abbr.toUpperCase()] ? (
                  <TeamRecordSosCard
                    record={{
                      wins: selectedTeam.baselineWins,
                      losses: selectedTeam.baselineLosses,
                      games: selectedTeam.baselineGames,
                      winRate: selectedTeam.baselineWinRate,
                    }}
                    sos={teamSosByAbbr[selectedTeam.abbr.toUpperCase()]}
                    teamName={selectedTeam.name}
                    className="ref-matrix-team-panel-sos"
                  />
                ) : selectedTeam.baselineGames > 0 ? (
                  <div className="ref-matrix-team-panel-baseline">
                    <span className="ref-matrix-team-panel-baseline-record">
                      {selectedTeam.baselineWins}-{selectedTeam.baselineLosses}
                    </span>
                    <span className="ref-matrix-team-panel-baseline-meta">
                      {formatPct(selectedTeam.baselineWinRate)} team baseline ·{" "}
                      {selectedTeam.baselineGames} gp sample
                    </span>
                  </div>
                ) : (
                  <p className="ref-matrix-team-panel-lead">
                    Team baseline unavailable for this sample.
                  </p>
                )}
                <p className="ref-matrix-team-panel-lead">
                  Top and bottom {TEAM_MATRIX_REF_PANEL_LIMIT}{" "}
                  {officialNounPlural} ranked by{" "}
                  {teamPanelSort === "record"
                    ? "win rate vs team baseline"
                    : `${whistleDiffLabel.toLowerCase()} (positive favors the team)`}
                  ; both W-L and {whistleDiffLabel.toLowerCase()} shown for
                  context. {minGames}+ games required.
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

          <div
            className="ref-matrix-team-panel-sort"
            role="group"
            aria-label="Sort top and bottom ref lists"
          >
            <button
              type="button"
              className={`ref-matrix-team-panel-sort-btn${teamPanelSort === "record" ? " ref-matrix-team-panel-sort-btn--active" : ""}`}
              aria-pressed={teamPanelSort === "record"}
              onClick={() => setTeamPanelSort("record")}
            >
              Record
            </button>
            <button
              type="button"
              className={`ref-matrix-team-panel-sort-btn${teamPanelSort === "penalty-diff" ? " ref-matrix-team-panel-sort-btn--active" : ""}`}
              aria-pressed={teamPanelSort === "penalty-diff"}
              onClick={() => setTeamPanelSort("penalty-diff")}
            >
              {whistleDiffLabel}
            </button>
          </div>

          <div className="ref-matrix-team-panel-columns">
            <TeamRefRankColumn
              titleId="ref-matrix-team-panel-top-title"
              title={`Top ${TEAM_MATRIX_REF_PANEL_LIMIT} ${
                teamPanelSort === "record"
                  ? "vs baseline"
                  : whistleDiffLabel.toLowerCase()
              }`}
              entries={topRefsForTeam}
              variant="positive"
              emptyMessage={`No qualified ${officialNounPlural} above baseline for ${selectedTeam.label} in this sample.`}
              basePath={basePath}
              sport={sport}
              whistleDiffLabel={whistleDiffLabel}
              teamBaselineWinRate={selectedTeam.baselineWinRate}
            />
            <TeamRefRankColumn
              titleId="ref-matrix-team-panel-bottom-title"
              title={`Bottom ${TEAM_MATRIX_REF_PANEL_LIMIT} ${
                teamPanelSort === "record"
                  ? "vs baseline"
                  : whistleDiffLabel.toLowerCase()
              }`}
              entries={bottomRefsForTeam}
              variant="negative"
              emptyMessage={`No qualified ${officialNounPlural} below baseline for ${selectedTeam.label} in this sample.`}
              basePath={basePath}
              sport={sport}
              whistleDiffLabel={whistleDiffLabel}
              teamBaselineWinRate={selectedTeam.baselineWinRate}
            />
          </div>

          {thinRefsForTeam.length > 0 && (
            <div className="ref-matrix-team-panel-thin">
              <h4 className="ref-matrix-team-panel-column-title">
                Below {minGames}-game sample ({thinRefsForTeam.length})
              </h4>
              <p className="ref-matrix-team-panel-lead">
                These {officialNounPlural} worked {selectedTeam.label} games but
                do not meet the ranking gate — including cases like a 5-game
                sample that looks missing from top/bottom.
              </p>
              <ul className="ref-matrix-team-panel-thin-list">
                {thinRefsForTeam.map((entry) => (
                  <li key={entry.refSlug}>
                    <Link
                      href={`${basePath}/refs/${entry.refSlug}`}
                      className="ref-matrix-team-panel-thin-link"
                    >
                      <span className="ref-matrix-team-panel-thin-name">
                        {entry.refName}
                      </span>
                      <span className="ref-matrix-team-panel-thin-meta">
                        {entry.wins}-{entry.losses} · {entry.games} gp
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
