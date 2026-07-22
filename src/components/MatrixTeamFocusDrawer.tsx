"use client";

import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { MatrixSplitShareBar } from "@/components/MatrixSplitShareBar";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamRecordSosCard } from "@/components/TeamRecordSosCard";
import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";
import type { LeagueId } from "@/lib/leagues";
import type { TeamStrengthOfSchedule } from "@/lib/nba-strength-of-schedule";
import {
  matrixTeamMetricGames,
  matrixTeamMetricRate,
  matrixTeamMetricRecord,
  type MatrixTeamPanelSort,
  type MatrixViewMode,
  type RefTeamMatrix,
  type TeamTopRefEntry,
} from "@/lib/ref-team-matrix";
import { formatBaselineAtsPct, formatBaselinePct } from "@/lib/stats-utils";

type MatrixTeamFocusDrawerProps = {
  open: boolean;
  onClose: () => void;
  matrix: RefTeamMatrix;
  selectedTeam: RefTeamMatrix["teams"][number];
  topRefs: TeamTopRefEntry[];
  bottomRefs: TeamTopRefEntry[];
  teamPanelSort: MatrixTeamPanelSort;
  onTeamPanelSortChange: (sort: MatrixTeamPanelSort) => void;
  viewMode: MatrixViewMode;
  basePath: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  leagueId: LeagueId;
  officialNounPlural: string;
  whistleDiffLabel: string;
  splitNoun: string;
  minGames: number;
  teamSosByAbbr?: Record<string, TeamStrengthOfSchedule>;
  teamShareText: string;
  teamLinkShareText: string;
  teamShareUrl: string;
  renderRankColumn: (
    props: {
      titleId: string;
      title: string;
      subtitle: string;
      variant: "positive" | "negative";
      entries: TeamTopRefEntry[];
      emptyMessage: string;
    },
  ) => ReactNode;
};

const DRAWER_TRANSITION_MS = 220;

export function MatrixTeamFocusDrawer({
  open,
  onClose,
  matrix,
  selectedTeam,
  topRefs,
  bottomRefs,
  teamPanelSort,
  onTeamPanelSortChange,
  viewMode,
  basePath,
  sport,
  leagueId,
  officialNounPlural,
  whistleDiffLabel,
  splitNoun,
  minGames,
  teamSosByAbbr,
  teamShareText,
  teamLinkShareText,
  teamShareUrl,
  renderRankColumn,
}: MatrixTeamFocusDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setRendered(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!rendered || !open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open, rendered]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!rendered) return null;

  return (
    <ModalPortal>
    <div
      className={`matrix-team-drawer-root${visible ? " matrix-team-drawer-root--open" : ""}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <aside
        ref={panelRef}
        className={`matrix-team-drawer${visible ? " matrix-team-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="matrix-team-drawer-head">
          <div className="matrix-team-drawer-brand">
            <TeamLogo
              team={{
                abbr: selectedTeam.abbr,
                name: selectedTeam.name,
                nbaId: selectedTeam.nbaId,
              }}
              sport={sport}
              size="xl"
              className="matrix-team-drawer-logo"
            />
            <div className="matrix-team-drawer-copy">
              <h2 id={titleId} className="matrix-team-drawer-title">
                {splitNoun}×team drill-down ·{" "}
                <Link href={`${basePath}/teams/${selectedTeam.abbr}`}>
                  {selectedTeam.label}
                </Link>
              </h2>
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
                  className="matrix-team-drawer-sos"
                />
              ) : matrixTeamMetricGames(selectedTeam, viewMode) > 0 ? (
                <p className="matrix-team-drawer-baseline tabular-nums">
                  <span>{matrixTeamMetricRecord(selectedTeam, viewMode)}</span>
                  <span>
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
                      {matrixTeamMetricGames(selectedTeam, viewMode)} gp
                    </VerifiedGamesHint>
                  </span>
                </p>
              ) : null}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="matrix-team-drawer-close rw-focus-ring"
            onClick={onClose}
            aria-label={`Close ${selectedTeam.label} drill-down`}
          >
            <X aria-hidden />
          </button>
        </header>

        <div
          className="matrix-team-drawer-sort"
          role="group"
          aria-label="Sort top and bottom ref lists"
        >
          <button
            type="button"
            className={`matrix-team-drawer-sort-btn${teamPanelSort === "record" ? " matrix-team-drawer-sort-btn--active" : ""}`}
            aria-pressed={teamPanelSort === "record"}
            onClick={() => onTeamPanelSortChange("record")}
          >
            Record
          </button>
          <button
            type="button"
            className={`matrix-team-drawer-sort-btn${teamPanelSort === "penalty-diff" ? " matrix-team-drawer-sort-btn--active" : ""}`}
            aria-pressed={teamPanelSort === "penalty-diff"}
            onClick={() => onTeamPanelSortChange("penalty-diff")}
          >
            {whistleDiffLabel}
          </button>
        </div>

        <div className="matrix-team-drawer-columns">
          {renderRankColumn({
            titleId: "matrix-team-drawer-top",
            title: "Favorable",
            subtitle:
              teamPanelSort === "record"
                ? viewMode === "ats"
                  ? `ATS cover above ${selectedTeam.label} baseline`
                  : `Win rate above ${selectedTeam.label} baseline`
                : `Most whistle edge for ${selectedTeam.label}`,
            variant: "positive",
            entries: topRefs,
            emptyMessage: `No qualified ${officialNounPlural} above baseline for ${selectedTeam.label}.`,
          })}
          {renderRankColumn({
            titleId: "matrix-team-drawer-bottom",
            title: "Unfavorable",
            subtitle:
              teamPanelSort === "record"
                ? viewMode === "ats"
                  ? `ATS cover below ${selectedTeam.label} baseline`
                  : `Win rate below ${selectedTeam.label} baseline`
                : `Least whistle edge for ${selectedTeam.label}`,
            variant: "negative",
            entries: bottomRefs,
            emptyMessage: `No qualified ${officialNounPlural} below baseline for ${selectedTeam.label}.`,
          })}
        </div>

        <p className="matrix-team-drawer-footnote">
          {minGames}+ games required for ranked lists. Historical splits only - not picks.
        </p>

        <MatrixSplitShareBar
          title="Share team matrix view"
          preview={`${selectedTeam.label} favorable/unfavorable ${officialNounPlural}`}
          shareText={teamShareText}
          linkShareText={teamLinkShareText}
          pageUrl={teamShareUrl}
        />
      </aside>
    </div>
    </ModalPortal>
  );
}
