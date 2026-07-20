"use client";

import Link from "next/link";
import { scrollToElement } from "@/lib/scroll-offset";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MatrixSplitShareBar } from "@/components/MatrixSplitShareBar";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import {
  formatMatrixTeamBaseline,
  matrixCellAriaLabel,
  matrixCellDisplayDelta,
  matrixCellKey,
  matrixCellMetricRecord,
  matrixCellMetricGames,
  matrixCellStyle,
  matrixTeamMetricGames,
  matrixTeamMetricRate,
  matrixTeamMetricRecord,
  MATRIX_DEFAULT_REF_SORT,
  MATRIX_DEFAULT_TEAM_COLUMN_SORT,
  MATRIX_DEFAULT_TEAM_PANEL_SORT,
  MATRIX_EXTREME_DELTA_PTS,
  MATRIX_REF_SORT_OPTIONS,
  MATRIX_STANDOUT_SORT_EXPLAINER,
  MATRIX_TEAM_COLUMN_SORT_OPTIONS,
  MATRIX_TONE_DELTA_PTS,
  matrixTeamColumnMatchesSearch,
  sortMatrixRefs,
  sortMatrixTeamColumns,
  TEAM_MATRIX_REF_PANEL_LIMIT,
  bottomRefsBelowBaselineForTeam,
  topRefsBeatingBaselineForTeam,
  type MatrixRefSort,
  type MatrixTeamColumnSort,
  type MatrixTeamPanelSort,
  type MatrixViewMode,
  type RefTeamMatrix,
  type TeamTopRefEntry,
} from "@/lib/ref-team-matrix";
import {
  adjustedDeltaTooltipText,
  displayWinRateDelta,
  formatDeltaPp,
} from "@/lib/data-maturity";
import {
  buildMatrixSplitShareLinkText,
  buildMatrixSplitShareText,
  buildMatrixSplitShareUrl,
  buildMatrixTeamShareLinkText,
  buildMatrixTeamShareText,
  buildMatrixTeamShareUrl,
} from "@/lib/matrix-split-share";
import type { LeagueId } from "@/lib/leagues";
import { leagueGameUnit } from "@/lib/leagues";
import { formatBaselineAtsPct, formatBaselinePct, formatTeamWhistleEdgeLabel } from "@/lib/stats-utils";
import type { SeasonScopeMode } from "@/lib/season-scope";
import { TeamRecordSosCard } from "@/components/TeamRecordSosCard";
import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";
import type { TeamStrengthOfSchedule } from "@/lib/nba-strength-of-schedule";
import "@/components/matrix-hub.css";

type RefTeamMatrixLayout = "default" | "matrix-first";

type RefTeamMatrixProps = {
  matrix: RefTeamMatrix;
  basePath: string;
  leagueLabel: string;
  officialNounPlural: string;
  whistleDiffLabel: string;
  sport: "nba" | "nhl" | "wnba" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  teamSosByAbbr?: Record<string, TeamStrengthOfSchedule>;
  siteUrl: string;
  leagueId: LeagueId;
  scopeMode: SeasonScopeMode;
  scopeLabel: string;
  initialTeamAbbr?: string | null;
  initialRefSlug?: string | null;
  atsAvailable?: boolean;
  initialViewMode?: MatrixViewMode;
  layout?: RefTeamMatrixLayout;
  /** Shown in matrix-first footer beside methodology link. */
  footerProvenanceNote?: string;
  /** Enables team column search and conference/alphabetical sort (CBB, CFB). */
  teamConferenceByAbbr?: Record<string, string>;
  teamConferenceOrder?: readonly string[];
};

const MATRIX_ATS_VIEW_TOOLTIP =
  "Controls for selection bias in high-profile marquee matchups by evaluating performance against the closing line instead of raw wins and losses.";

function MatrixLegendBlock({ minGames }: { minGames: number }) {
  return (
    <>
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
    </>
  );
}

function teamPanelEntryRecord(
  entry: TeamTopRefEntry,
  viewMode: MatrixViewMode,
): string {
  return matrixCellMetricRecord(
    {
      refSlug: entry.refSlug,
      teamAbbr: "",
      games: entry.games,
      wins: entry.wins,
      losses: entry.losses,
      winRate: entry.winRate,
      atsWins: entry.atsWins,
      atsLosses: entry.atsLosses,
      atsPushes: entry.atsPushes,
      atsGames: entry.atsGames,
      atsCoverRate: entry.atsCoverRate,
      avgFoulDifferential: entry.avgFoulDifferential,
    },
    viewMode,
  );
}

function matrixPathFor(basePath: string): string {
  return basePath ? `${basePath}/matrix` : "/matrix";
}

function resolveInitialTeamAbbr(
  teams: RefTeamMatrix["teams"],
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  const match = teams.find((team) => team.abbr.toUpperCase() === normalized);
  return match?.abbr ?? null;
}

function TeamRefRankListItem({
  entry,
  rank,
  variant,
  basePath,
  sport,
  whistleDiffLabel,
  teamLabel,
  teamBaselineRate,
  teamBaselineGames,
  viewMode,
}: {
  entry: TeamTopRefEntry;
  rank: number;
  variant: "positive" | "negative";
  basePath: string;
  sport: RefTeamMatrixProps["sport"];
  whistleDiffLabel: string;
  teamLabel: string;
  teamBaselineRate: number;
  teamBaselineGames: number;
  viewMode: MatrixViewMode;
}) {
  const deltaClass =
    variant === "positive"
      ? "ref-matrix-delta--positive"
      : "ref-matrix-delta--negative";
  const deltaDisplay = displayWinRateDelta(entry.deltaPts, entry.games);
  const winDeltaFullLabel =
    teamBaselineGames > 0
      ? formatDeltaPp(deltaDisplay.displayDelta).replace("pp", " pts vs team")
      : "Baseline n/a";
  const winDeltaLabel =
    teamBaselineGames > 0
      ? formatDeltaPp(deltaDisplay.displayDelta).replace("pp", " pts")
      : "Baseline n/a";
  const recordLabel = viewMode === "ats" ? "ATS cover rate" : "Win rate";
  const whistleUnit = whistleDiffLabel.replace(/\s+diff$/i, "").toLowerCase();
  const whistleEdgeLabel = formatTeamWhistleEdgeLabel(
    entry.avgFoulDifferential,
    teamLabel,
    whistleUnit,
    { compact: true },
  );
  const whistleEdgeFullLabel = formatTeamWhistleEdgeLabel(
    entry.avgFoulDifferential,
    teamLabel,
    whistleUnit,
  );

  return (
    <li className="ref-matrix-team-panel-item">
      <span className="ref-matrix-team-panel-rank" aria-hidden>
        {rank}
      </span>
      <div className="ref-matrix-team-panel-ref-wrap">
        <Link
          href={`${basePath}/refs/${entry.refSlug}#close-game`}
          className="ref-matrix-team-panel-ref-avatar-link"
          aria-label={`${entry.refName} profile`}
        >
          <RefAvatar
            name={entry.refName}
            slug={entry.refSlug}
            sport={sport}
            size="md"
            className="ref-matrix-team-panel-ref-avatar"
          />
        </Link>
        <Link
          href={`${basePath}/refs/${entry.refSlug}#close-game`}
          className="ref-matrix-team-panel-ref-name"
          title={entry.refName}
        >
          {entry.refName}
        </Link>
      </div>
      <span className="ref-matrix-team-panel-record">
        <span className="ref-matrix-team-panel-record-line">
          {teamPanelEntryRecord(entry, viewMode)}
        </span>
        <span
          className={`ref-matrix-team-panel-win-delta ${deltaClass}${
            deltaDisplay.isAdjusted ? " ref-matrix-delta--adjusted" : ""
          }`}
          title={
            deltaDisplay.isAdjusted
              ? adjustedDeltaTooltipText(deltaDisplay.displayDelta)
              : `${recordLabel} vs team baseline: ${winDeltaFullLabel}`
          }
        >
          {winDeltaLabel}
        </span>
      </span>
      <span className="ref-matrix-team-panel-games ref-matrix-team-panel-games--primary">
        <VerifiedGamesHint>{entry.games} gp</VerifiedGamesHint>
      </span>
      <span
        className="ref-matrix-team-panel-delta"
        title={`${whistleDiffLabel}: ${whistleEdgeFullLabel} per game`}
      >
        {whistleEdgeLabel}
      </span>
    </li>
  );
}

function TeamRefRankColumn({
  titleId,
  title,
  subtitle,
  variant,
  entries,
  emptyMessage,
  basePath,
  sport,
  leagueId,
  whistleDiffLabel,
  teamLabel,
  teamBaselineRate,
  teamBaselineGames,
  viewMode,
}: {
  titleId: string;
  title: string;
  subtitle: string;
  variant: "positive" | "negative";
  entries: TeamTopRefEntry[];
  emptyMessage: string;
  basePath: string;
  sport: RefTeamMatrixProps["sport"];
  leagueId: LeagueId;
  whistleDiffLabel: string;
  teamLabel: string;
  teamBaselineRate: number;
  teamBaselineGames: number;
  viewMode: MatrixViewMode;
}) {
  const recordHead = viewMode === "ats" ? "ATS" : "W-L";

  return (
    <div
      className={`ref-matrix-team-panel-column ref-matrix-team-panel-column--${variant}`}
    >
      <div className="ref-matrix-team-panel-column-head">
        <h4 id={titleId} className="ref-matrix-team-panel-column-title">
          {title}
        </h4>
        <p className="ref-matrix-team-panel-column-subtitle">{subtitle}</p>
      </div>
      {entries.length === 0 ? (
        <p className="ref-matrix-team-panel-empty">{emptyMessage}</p>
      ) : (
        <>
          <div
            className="ref-matrix-team-panel-list-head"
            aria-hidden
          >
            <span className="ref-matrix-team-panel-list-head-rank">#</span>
            <span className="ref-matrix-team-panel-list-head-official">
              Official
            </span>
            <span className="ref-matrix-team-panel-list-head-stat">{recordHead}</span>
            <span className="ref-matrix-team-panel-list-head-stat">Gp</span>
            <span className="ref-matrix-team-panel-list-head-stat">Whistle</span>
          </div>
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
                teamLabel={teamLabel}
                teamBaselineRate={teamBaselineRate}
                teamBaselineGames={teamBaselineGames}
                viewMode={viewMode}
              />
            ))}
          </ul>
        </>
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
  siteUrl,
  leagueId,
  scopeMode,
  scopeLabel,
  initialTeamAbbr,
  initialRefSlug,
  atsAvailable = false,
  initialViewMode = "wl",
  layout = "default",
  footerProvenanceNote,
  teamConferenceByAbbr,
  teamConferenceOrder,
}: RefTeamMatrixProps) {
  const { refs, teams, cells, minGames, qualifiedCellCount } = matrix;
  const teamColumnControls =
    teamConferenceByAbbr != null && teamConferenceOrder != null;
  const matrixFirst = layout === "matrix-first";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const matrixPath = matrixPathFor(basePath);
  const resolvedInitialTeam = resolveInitialTeamAbbr(teams, initialTeamAbbr);
  const [selectedTeamAbbr, setSelectedTeamAbbr] = useState<string | null>(
    resolvedInitialTeam,
  );
  const [refSort, setRefSort] = useState<MatrixRefSort>(MATRIX_DEFAULT_REF_SORT);
  const [teamPanelSort, setTeamPanelSort] = useState<MatrixTeamPanelSort>(
    MATRIX_DEFAULT_TEAM_PANEL_SORT,
  );
  const [viewMode, setViewMode] = useState<MatrixViewMode>(
    initialViewMode === "ats" && atsAvailable ? "ats" : "wl",
  );
  const [crosshair, setCrosshair] = useState<MatrixCrosshair | null>(() => {
    if (!initialRefSlug || !resolvedInitialTeam) return null;
    return { refSlug: initialRefSlug, teamAbbr: resolvedInitialTeam };
  });
  const teamPanelRef = useRef<HTMLElement>(null);
  const deepLinkScrolledRef = useRef(false);
  const [refSearch, setRefSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamColumnSort, setTeamColumnSort] = useState<MatrixTeamColumnSort>(
    MATRIX_DEFAULT_TEAM_COLUMN_SORT,
  );
  const searchQuery = refSearch.trim().toLowerCase();
  const teamSearchQuery = teamSearch.trim();
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
  const displayTeams = useMemo(() => {
    if (!teamColumnControls) return teams;
    const sorted = sortMatrixTeamColumns(
      teams,
      teamColumnSort,
      teamConferenceByAbbr,
      teamConferenceOrder,
    );
    if (!teamSearchQuery) return sorted;
    return sorted.filter(
      (team) =>
        matrixTeamColumnMatchesSearch(team, teamSearchQuery, teamConferenceByAbbr) ||
        team.abbr === selectedTeamAbbr,
    );
  }, [
    selectedTeamAbbr,
    teamColumnControls,
    teamColumnSort,
    teamConferenceByAbbr,
    teamConferenceOrder,
    teamSearchQuery,
    teams,
  ]);
  const teamSearchMatchCount = displayTeams.length;
  const topRefsForTeam = useMemo(
    () =>
      selectedTeamAbbr
        ? topRefsBeatingBaselineForTeam(
            matrix,
            selectedTeamAbbr,
            TEAM_MATRIX_REF_PANEL_LIMIT,
            teamPanelSort,
            viewMode,
          )
        : [],
    [matrix, selectedTeamAbbr, teamPanelSort, viewMode],
  );
  const bottomRefsForTeam = useMemo(
    () =>
      selectedTeamAbbr
        ? bottomRefsBelowBaselineForTeam(
            matrix,
            selectedTeamAbbr,
            TEAM_MATRIX_REF_PANEL_LIMIT,
            teamPanelSort,
            viewMode,
          )
        : [],
    [matrix, selectedTeamAbbr, teamPanelSort, viewMode],
  );
  const teamPanelRefSlugs = useMemo(() => {
    if (!selectedTeamAbbr) return null;
    const slugs = new Set<string>();
    for (const entry of topRefsForTeam) slugs.add(entry.refSlug);
    for (const entry of bottomRefsForTeam) slugs.add(entry.refSlug);
    return slugs;
  }, [bottomRefsForTeam, selectedTeamAbbr, topRefsForTeam]);
  const visibleRefs = useMemo(() => {
    let pool = sortedRefs;
    if (teamPanelRefSlugs) {
      pool = pool.filter((ref) => teamPanelRefSlugs.has(ref.slug));
    }
    if (!searchQuery) return pool;
    return pool.filter((ref) =>
      ref.name.toLowerCase().includes(searchQuery),
    );
  }, [searchQuery, sortedRefs, teamPanelRefSlugs]);
  const searchMatchCount = visibleRefs.length;
  const officialLabel =
    officialNounPlural.charAt(0).toUpperCase() + officialNounPlural.slice(1);
  const splitNoun =
    sport === "nhl" || sport === "nfl" || sport === "cfb" ? "Official" : "Ref";

  const syncMatrixUrl = useCallback(
    (next: { team?: string | null; ref?: string | null; mode?: MatrixViewMode | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.team) params.set("team", next.team.toUpperCase());
      else if (next.team === null) params.delete("team");
      if (next.ref) params.set("ref", next.ref);
      else if (next.ref === null) params.delete("ref");
      if (next.mode === "ats" && atsAvailable) params.set("mode", "ats");
      else if (next.mode === "wl" || next.mode === null) params.delete("mode");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [atsAvailable, pathname, router, searchParams],
  );

  const setViewModeAndUrl = useCallback(
    (mode: MatrixViewMode) => {
      setViewMode(mode);
      syncMatrixUrl({ mode });
    },
    [syncMatrixUrl],
  );

  const crosshairShare = useMemo(() => {
    if (!crosshair) return null;
    const ref = refs.find((entry) => entry.slug === crosshair.refSlug);
    const team = teams.find((entry) => entry.abbr === crosshair.teamAbbr);
    if (!ref || !team) return null;
    const cell = cells[matrixCellKey(ref.slug, team.abbr)];
    if (!cell || cell.thinSample) return null;
    return { ref, team, cell };
  }, [cells, crosshair, refs, teams]);

  const crosshairShareText = useMemo(() => {
    if (!crosshairShare) return "";
    return buildMatrixSplitShareText({
      siteUrl,
      matrixPath,
      scopeMode,
      leagueLabel,
      scopeLabel,
      whistleDiffLabel,
      ref: crosshairShare.ref,
      team: crosshairShare.team,
      cell: crosshairShare.cell,
    });
  }, [
    crosshairShare,
    leagueLabel,
    matrixPath,
    scopeLabel,
    scopeMode,
    siteUrl,
    whistleDiffLabel,
  ]);

  const crosshairShareUrl = useMemo(() => {
    if (!crosshairShare) return "";
    return buildMatrixSplitShareUrl({
      siteUrl,
      matrixPath,
      scopeMode,
      leagueLabel,
      scopeLabel,
      whistleDiffLabel,
      ref: crosshairShare.ref,
      team: crosshairShare.team,
      cell: crosshairShare.cell,
    });
  }, [
    crosshairShare,
    leagueLabel,
    matrixPath,
    scopeLabel,
    scopeMode,
    siteUrl,
    whistleDiffLabel,
  ]);

  const teamShareText = useMemo(() => {
    if (!selectedTeam) return "";
    return buildMatrixTeamShareText({
      siteUrl,
      matrixPath,
      scopeMode,
      leagueLabel,
      scopeLabel,
      team: selectedTeam,
      officialNounPlural,
    });
  }, [
    leagueLabel,
    matrixPath,
    officialNounPlural,
    scopeLabel,
    scopeMode,
    selectedTeam,
    siteUrl,
  ]);

  const teamLinkShareText = useMemo(() => {
    if (!selectedTeam) return "";
    return buildMatrixTeamShareLinkText({
      siteUrl,
      matrixPath,
      scopeMode,
      scopeLabel,
      team: selectedTeam,
    });
  }, [matrixPath, scopeLabel, scopeMode, selectedTeam, siteUrl]);

  const teamShareUrl = useMemo(() => {
    if (!selectedTeam) return "";
    return buildMatrixTeamShareUrl(
      siteUrl,
      matrixPath,
      selectedTeam.abbr,
      scopeMode,
    );
  }, [matrixPath, scopeMode, selectedTeam, siteUrl]);

  const crosshairLinkShareText = useMemo(() => {
    if (!crosshairShare) return "";
    return buildMatrixSplitShareLinkText({
      siteUrl,
      matrixPath,
      scopeMode,
      leagueLabel,
      scopeLabel,
      whistleDiffLabel,
      ref: crosshairShare.ref,
      team: crosshairShare.team,
      cell: crosshairShare.cell,
    });
  }, [
    crosshairShare,
    leagueLabel,
    matrixPath,
    scopeLabel,
    scopeMode,
    siteUrl,
    whistleDiffLabel,
  ]);

  useEffect(() => {
    if (deepLinkScrolledRef.current) return;
    if (!resolvedInitialTeam && !initialRefSlug) return;

    const scrollToDeepLinkTarget = () => {
      if (deepLinkScrolledRef.current) return;

      if (initialRefSlug && resolvedInitialTeam) {
        const selector = `[data-matrix-cell="${CSS.escape(initialRefSlug)}:${CSS.escape(resolvedInitialTeam)}"]`;
        const cell = document.querySelector(selector);
        if (cell instanceof HTMLElement) {
          scrollToElement(cell, "smooth");
          deepLinkScrolledRef.current = true;
          return;
        }
      }

      if (resolvedInitialTeam && teamPanelRef.current) {
        scrollToElement(teamPanelRef.current, "smooth");
        deepLinkScrolledRef.current = true;
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToDeepLinkTarget);
    });
  }, [initialRefSlug, resolvedInitialTeam, selectedTeamAbbr]);

  function toggleTeamFilter(teamAbbr: string) {
    setSelectedTeamAbbr((current) => {
      const next = current === teamAbbr ? null : teamAbbr;
      syncMatrixUrl({
        team: next,
        ref: next ? crosshair?.refSlug ?? null : null,
      });
      return next;
    });
  }

  function clearTeamFilter() {
    setSelectedTeamAbbr(null);
    syncMatrixUrl({ team: null, ref: null });
  }

  function activateCrosshair(refSlug: string, teamAbbr: string) {
    setCrosshair({ refSlug, teamAbbr });
  }

  function clearCrosshair() {
    setCrosshair(null);
  }

  return (
    <div
      className={`ref-matrix${matrixFirst ? " ref-matrix--matrix-first" : ""}`}
      data-league={sport}
    >
      {!matrixFirst ? (
        <details className="ref-matrix-legend-details">
          <summary className="ref-matrix-legend-summary">
            How to read this board
          </summary>
          <div className="ref-matrix-legend">
            <MatrixLegendBlock minGames={minGames} />
          </div>
        </details>
      ) : null}

      <div
        className={`ref-matrix-toolbar${matrixFirst ? " ref-matrix-toolbar--compact" : ""}`}
      >
        {!matrixFirst ? (
          <p className="ref-matrix-meta">
            {refs.length} {officialNounPlural} ×{" "}
            {teamSearchQuery && teamColumnControls
              ? `${teamSearchMatchCount} of ${teams.length}`
              : teams.length}{" "}
            teams · {qualifiedCellCount} qualified cells
          </p>
        ) : null}
        <div className="ref-matrix-toolbar-actions">
          {!matrixFirst ? (
            <Link href="/compare" className="ref-matrix-compare-link">
              Compare officials →
            </Link>
          ) : null}
          <div className="ref-matrix-search">
            <label htmlFor="ref-matrix-search" className="ref-matrix-search-label">
              Find official
            </label>
            <input
              id="ref-matrix-search"
              type="search"
              value={refSearch}
              onChange={(e) => setRefSearch(e.target.value)}
              placeholder="e.g. Land Clark"
              className="ref-matrix-search-input"
              aria-describedby="ref-matrix-search-hint"
            />
            <p
              id="ref-matrix-search-hint"
              className={`ref-matrix-search-hint${matrixFirst ? " ref-matrix-toolbar-hint--compact" : ""}`}
            >
              {searchQuery
                ? searchMatchCount > 0
                  ? `${searchMatchCount} result${searchMatchCount === 1 ? "" : "s"}${selectedTeam ? ` in top and bottom ${TEAM_MATRIX_REF_PANEL_LIMIT} for ${selectedTeam.label}` : `. Thin-sample rows stay visible with a ${leagueGameUnit(leagueId)} count`}`
                  : selectedTeam
                    ? `No results in top and bottom ${TEAM_MATRIX_REF_PANEL_LIMIT} for ${selectedTeam.label}. Clear search or team filter`
                    : "No results in this matrix. Try a shorter name or check rankings"
                : selectedTeam
                  ? `Showing top and bottom ${TEAM_MATRIX_REF_PANEL_LIMIT} ${officialNounPlural} for ${selectedTeam.label} only`
                  : "Filter rows by name; includes thin-sample rows"}
            </p>
          </div>
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
                className={`ref-matrix-sort-explainer${matrixFirst ? " ref-matrix-toolbar-hint--compact" : ""}`}
              >
                {MATRIX_STANDOUT_SORT_EXPLAINER}
              </p>
            ) : null}
          </div>
          {teamColumnControls ? (
            <>
              <div className="ref-matrix-search">
                <label
                  htmlFor="ref-matrix-team-search"
                  className="ref-matrix-search-label"
                >
                  Find team
                </label>
                <input
                  id="ref-matrix-team-search"
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="e.g. Duke or ACC"
                  className="ref-matrix-search-input"
                  aria-describedby="ref-matrix-team-search-hint"
                />
                <p
                  id="ref-matrix-team-search-hint"
                  className={`ref-matrix-search-hint${matrixFirst ? " ref-matrix-toolbar-hint--compact" : ""}`}
                >
                  {teamSearchQuery
                    ? teamSearchMatchCount > 0
                      ? `${teamSearchMatchCount} team column${teamSearchMatchCount === 1 ? "" : "s"} match`
                      : "No teams match. Try abbr, school name, or conference"
                    : "Filter columns by abbr, school, or conference"}
                </p>
              </div>
              <div className="ref-matrix-sort">
                <label
                  htmlFor="ref-matrix-team-sort"
                  className="ref-matrix-sort-label"
                >
                  Sort columns
                </label>
                <select
                  id="ref-matrix-team-sort"
                  value={teamColumnSort}
                  onChange={(e) =>
                    setTeamColumnSort(e.target.value as MatrixTeamColumnSort)
                  }
                  className="ref-matrix-sort-select"
                  aria-label="Sort team columns"
                >
                  {MATRIX_TEAM_COLUMN_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
          {atsAvailable ? (
            <div className="ref-matrix-view-mode">
              <span className="ref-matrix-view-mode-label" id="ref-matrix-view-mode-label">
                View mode
              </span>
              <div
                className="refs-directory-metric-toggle ref-matrix-view-mode-toggle"
                role="group"
                aria-labelledby="ref-matrix-view-mode-label"
              >
                <button
                  type="button"
                  className={`refs-directory-metric-btn${viewMode === "wl" ? " refs-directory-metric-btn--active" : ""}`}
                  aria-pressed={viewMode === "wl"}
                  onClick={() => setViewModeAndUrl("wl")}
                >
                  Win/Loss
                </button>
                <button
                  type="button"
                  className={`refs-directory-metric-btn${viewMode === "ats" ? " refs-directory-metric-btn--active" : ""}`}
                  aria-pressed={viewMode === "ats"}
                  aria-describedby="ref-matrix-ats-tooltip"
                  onClick={() => setViewModeAndUrl("ats")}
                >
                  Against the Spread
                </button>
              </div>
              <p
                id="ref-matrix-ats-tooltip"
                className={`ref-matrix-view-mode-tooltip${matrixFirst ? " ref-matrix-toolbar-hint--compact" : ""}`}
              >
                {MATRIX_ATS_VIEW_TOOLTIP}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="ref-matrix-mobile-hint sm:hidden">
        Scroll horizontally to compare all {leagueLabel} teams. Baseline{" "}
        {viewMode === "ats" ? "ATS" : "W-L"} sits under each logo; cell numbers are
        ref×team splits only.
      </p>

      <div className="ref-matrix-wrap" onMouseLeave={clearCrosshair}>
        <table className="ref-matrix-table">
          <thead>
            <tr className="ref-matrix-logo-row">
              <th scope="col" className="ref-matrix-corner">
                {officialLabel}
              </th>
              {displayTeams.map((team) => {
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
                {viewMode === "ats" ? "Team ATS baseline" : "Team baseline"}
              </th>
              {displayTeams.map((team) => {
                const isSelected = selectedTeamAbbr === team.abbr;
                const baselineGames = matrixTeamMetricGames(team, viewMode);
                const baselineRate = matrixTeamMetricRate(team, viewMode);
                return (
                  <td
                    key={team.abbr}
                    className={`ref-matrix-baseline-cell${isSelected ? " ref-matrix-baseline-cell--selected" : ""}${colCrosshairClass(team.abbr, crosshair)}`}
                    title={`${team.label} sample baseline: ${formatMatrixTeamBaseline(team, viewMode)}`}
                    onMouseEnter={() => activateCrosshair("", team.abbr)}
                  >
                    <span className="ref-matrix-baseline-record">
                      {matrixTeamMetricRecord(team, viewMode)}
                    </span>
                    <span className="ref-matrix-baseline-meta">
                      {viewMode === "ats"
                        ? formatBaselineAtsPct(baselineGames, baselineRate)
                        : formatBaselinePct(baselineGames, baselineRate)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRefs.length === 0 ? (
              <tr>
                <td
                  colSpan={displayTeams.length + 1}
                  className="ref-matrix-empty-search"
                >
                  No {officialNounPlural} found for &ldquo;{refSearch.trim()}&rdquo;.
                  Clear search or browse rankings.
                </td>
              </tr>
            ) : (
              visibleRefs.map((ref) => {
              const rowActive = crosshair?.refSlug === ref.slug;
              const rowSearchHit = searchQuery.length > 0;
              return (
                <tr
                  key={ref.slug}
                  className={[
                    rowActive ? "ref-matrix-row--crosshair" : undefined,
                    rowSearchHit ? "ref-matrix-row--search-hit" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                  {displayTeams.map((team) => {
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
                          data-matrix-cell={`${ref.slug}:${team.abbr}`}
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

                    const baselineGames = matrixTeamMetricGames(team, viewMode);
                    const baselineRate = matrixTeamMetricRate(team, viewMode);
                    const { tone, extreme, deltaPts } = matrixCellStyle(
                      cell,
                      baselineRate,
                      baselineGames,
                      viewMode,
                    );
                    const deltaDisplay = matrixCellDisplayDelta(
                      cell,
                      baselineRate,
                      viewMode,
                    );
                    const record = matrixCellMetricRecord(cell, viewMode);
                    const ariaLabel = cell.thinSample
                      ? `${ref.name} with ${team.label}: ${record} in ${cell.games} games (thin sample)`
                      : matrixCellAriaLabel(
                          ref.name,
                          team,
                          cell,
                          deltaPts,
                          viewMode,
                        );

                    return (
                      <td
                        key={team.abbr}
                        data-matrix-cell={`${ref.slug}:${team.abbr}`}
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
                          <span className="ref-matrix-games ref-matrix-games--primary">
                            <VerifiedGamesHint>
                              {matrixCellMetricGames(cell, viewMode)} gp
                            </VerifiedGamesHint>
                          </span>
                          <span className="ref-matrix-record">{record}</span>
                          {!cell.thinSample ? (
                            <span
                              className={`ref-matrix-delta ${deltaClass(tone)}${
                                deltaDisplay.isAdjusted
                                  ? " ref-matrix-delta--adjusted"
                                  : ""
                              }`}
                            >
                              {baselineGames > 0
                                ? formatDeltaPp(deltaDisplay.displayDelta).replace(
                                    "pp",
                                    " pts vs team",
                                  )
                                : "Baseline n/a"}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {crosshairShare ? (
        <MatrixSplitShareBar
          title="Share this ref×team split"
          preview={`${crosshairShare.ref.name} × ${crosshairShare.team.label}`}
          shareText={crosshairShareText}
          linkShareText={crosshairLinkShareText}
          pageUrl={crosshairShareUrl}
        />
      ) : null}

      {selectedTeam && (
        <section
          ref={teamPanelRef}
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
                size="xl"
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
                viewMode === "wl" &&
                selectedTeam.baselineGames > 0 &&
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
                ) : matrixTeamMetricGames(selectedTeam, viewMode) > 0 ? (
                  <div className="ref-matrix-team-panel-baseline">
                    <span className="ref-matrix-team-panel-baseline-record">
                      {matrixTeamMetricRecord(selectedTeam, viewMode)}
                    </span>
                    <span className="ref-matrix-team-panel-baseline-meta">
                      {viewMode === "ats"
                        ? formatBaselineAtsPct(
                            matrixTeamMetricGames(selectedTeam, viewMode),
                            matrixTeamMetricRate(selectedTeam, viewMode),
                          )
                        : formatBaselinePct(
                            selectedTeam.baselineGames,
                            selectedTeam.baselineWinRate,
                          )}{" "}
                      team baseline ·{" "}
                      <VerifiedGamesHint>
                        {matrixTeamMetricGames(selectedTeam, viewMode)}{" "}
                        {viewMode === "ats" ? "lined gp" : "gp"}
                      </VerifiedGamesHint>{" "}
                      sample
                    </span>
                  </div>
                ) : (
                  <p className="ref-matrix-team-panel-lead">
                    Team baseline unavailable for this sample.
                  </p>
                )}
                <p className="ref-matrix-team-panel-lead">
                  Favorable and unfavorable {officialNounPlural} vs{" "}
                  {selectedTeam.label}&apos;s sample baseline. Ranked by{" "}
                  {teamPanelSort === "record"
                    ? viewMode === "ats"
                      ? "ATS cover rate vs baseline"
                      : "win rate vs baseline"
                    : `${whistleDiffLabel.toLowerCase()} (fewer or more on ${selectedTeam.label})`}
                  . Only {minGames}+ game splits qualify for these lists; thin
                  samples are excluded.
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
              title={`Top ${TEAM_MATRIX_REF_PANEL_LIMIT}`}
              subtitle={
                teamPanelSort === "record"
                  ? viewMode === "ats"
                    ? `ATS cover above ${selectedTeam.label} baseline`
                    : `Win rate above ${selectedTeam.label} baseline`
                  : `Fewest ${whistleDiffLabel.replace(/\s+diff$/i, "").toLowerCase()} on ${selectedTeam.label}`
              }
              variant="positive"
              entries={topRefsForTeam}
              emptyMessage={`No qualified ${officialNounPlural} above baseline for ${selectedTeam.label} in this sample.`}
              basePath={basePath}
              sport={sport}
              leagueId={leagueId}
              whistleDiffLabel={whistleDiffLabel}
              teamLabel={selectedTeam.label}
              teamBaselineRate={matrixTeamMetricRate(selectedTeam, viewMode)}
              teamBaselineGames={matrixTeamMetricGames(selectedTeam, viewMode)}
              viewMode={viewMode}
            />
            <TeamRefRankColumn
              titleId="ref-matrix-team-panel-bottom-title"
              title={`Bottom ${TEAM_MATRIX_REF_PANEL_LIMIT}`}
              subtitle={
                teamPanelSort === "record"
                  ? viewMode === "ats"
                    ? `ATS cover below ${selectedTeam.label} baseline`
                    : `Win rate below ${selectedTeam.label} baseline`
                  : `Most ${whistleDiffLabel.replace(/\s+diff$/i, "").toLowerCase()} on ${selectedTeam.label}`
              }
              variant="negative"
              entries={bottomRefsForTeam}
              emptyMessage={`No qualified ${officialNounPlural} below baseline for ${selectedTeam.label} in this sample.`}
              basePath={basePath}
              sport={sport}
              leagueId={leagueId}
              whistleDiffLabel={whistleDiffLabel}
              teamLabel={selectedTeam.label}
              teamBaselineRate={matrixTeamMetricRate(selectedTeam, viewMode)}
              teamBaselineGames={matrixTeamMetricGames(selectedTeam, viewMode)}
              viewMode={viewMode}
            />
          </div>

          <MatrixSplitShareBar
            title="Share team matrix view"
            preview={`${selectedTeam.label} favorable/unfavorable ${officialNounPlural}`}
            shareText={teamShareText}
            linkShareText={teamLinkShareText}
            pageUrl={teamShareUrl}
          />
        </section>
      )}

      {matrixFirst ? (
        <details className="ref-matrix-info-footer">
          <summary className="ref-matrix-info-footer-summary">Info</summary>
          <div className="ref-matrix-info-footer-body">
            <p className="ref-matrix-meta">
              {refs.length} {officialNounPlural} × {teams.length} teams ·{" "}
              {qualifiedCellCount} qualified cells
            </p>
            <div className="ref-matrix-legend">
              <MatrixLegendBlock minGames={minGames} />
            </div>
            {footerProvenanceNote ? (
              <p className="ref-matrix-footer-provenance">
                {footerProvenanceNote}{" "}
                <Link href="/methodology" className="ref-matrix-footer-methodology">
                  Methodology
                </Link>
              </p>
            ) : (
              <p className="ref-matrix-footer-provenance">
                <Link href="/methodology" className="ref-matrix-footer-methodology">
                  Methodology
                </Link>
              </p>
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
