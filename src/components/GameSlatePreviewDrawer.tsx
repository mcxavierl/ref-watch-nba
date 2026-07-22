"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Copy, X } from "lucide-react";
import { MatchupPreviewTerminal } from "@/components/MatchupPreviewTerminal";
import { ExportOnAirGraphicTrigger } from "@/components/media/MediaCardModal";
import { ModalPortal } from "@/components/ModalPortal";
import { OuLeanBadge } from "@/components/OuLeanBadge";
import { TeamLogo } from "@/components/TeamLogo";
import { safeBuildProjectionEvidence } from "@/lib/safe-build-projection-evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { GameSlatePreviewErrorBoundary } from "@/components/GameSlatePreviewErrorBoundary";
import { resolveSlateTeam, slateTeamLogoSport } from "@/lib/slate-team-display";
import { normalizeGameSlatePreview } from "@/lib/normalize-game-slate-preview";
import { buildMatchupBriefingClipboardText } from "@/lib/matchup-preview-terminal";
import "@/components/matchup-preview-terminal.css";

const DRAWER_TRANSITION_MS = 220;

type GameSlatePreviewDrawerProps = {
  preview: GameSlatePreviewPayload | null;
  open: boolean;
  onClose: () => void;
};

export function GameSlatePreviewDrawer({
  preview,
  open,
  onClose,
}: GameSlatePreviewDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

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
  }, [rendered, open, onClose]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!rendered) return null;

  const safePreview = normalizeGameSlatePreview(preview);
  if (!safePreview) return null;

  const awayTeam = safePreview.awayAbbr
    ? resolveSlateTeam(safePreview.leagueId, safePreview.awayAbbr)
    : null;
  const homeTeam = safePreview.homeAbbr
    ? resolveSlateTeam(safePreview.leagueId, safePreview.homeAbbr)
    : null;
  const sport = slateTeamLogoSport(safePreview.leagueId);
  const projectionEvidence = safeBuildProjectionEvidence(safePreview);
  const awaitingCrew = safePreview.awaitingCrew ?? safePreview.crew.length === 0;
  const briefing = safePreview.matchupBriefing;
  const drawerKicker = awaitingCrew
    ? `${safePreview.leagueLabel} · Matchup sheet`
    : `${safePreview.leagueLabel} · Matchup intelligence`;
  const insufficientCopy = awaitingCrew
    ? "Limited head-to-head history for this pairing. Context below uses recent team form and slate notes."
    : "Not enough qualified crew history to show composite tendencies yet.";
  const canCopyBriefing = !awaitingCrew && !safePreview.insufficientSample && Boolean(projectionEvidence);

  const handleCopyBriefing = async () => {
    if (!projectionEvidence) return;
    const text = buildMatchupBriefingClipboardText(safePreview, projectionEvidence);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  return (
    <ModalPortal>
      <div
        className={`ref-preview-drawer-backdrop${visible ? " ref-preview-drawer-backdrop--visible" : ""}`}
        role="presentation"
        onClick={handleBackdropClick}
      >
        <aside
          ref={panelRef}
          className={`ref-preview-drawer game-slate-preview-drawer${visible ? " ref-preview-drawer--visible" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-league={safePreview.leagueId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ref-preview-drawer-header">
            <div className="ref-preview-drawer-header-copy">
              <p className="ref-preview-drawer-kicker">{drawerKicker}</p>
              <div className="ref-preview-drawer-title-row">
                <div className="game-slate-preview-matchup">
                  {awayTeam && homeTeam ? (
                    <>
                      <TeamLogo team={awayTeam} sport={sport} size="md" />
                      <span className="game-slate-preview-at" aria-hidden>
                        @
                      </span>
                      <TeamLogo team={homeTeam} sport={sport} size="md" />
                    </>
                  ) : null}
                  <h2 className="ref-preview-drawer-title" id={titleId}>
                    {safePreview.matchup}
                  </h2>
                </div>
                <OuLeanBadge lean={safePreview.ouLean} />
              </div>
            </div>
            <div className="ref-preview-drawer-header-actions">
              {canCopyBriefing ? (
                <button
                  type="button"
                  className="game-slate-preview-copy-briefing rw-focus-ring"
                  onClick={() => void handleCopyBriefing()}
                  aria-label="Copy briefing summary"
                >
                  <Copy size={14} aria-hidden />
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "error"
                      ? "Copy failed"
                      : "Copy briefing summary"}
                </button>
              ) : null}
              {safePreview.broadcastExport ? (
                <ExportOnAirGraphicTrigger
                  broadcastExport={safePreview.broadcastExport}
                  className="game-slate-preview-broadcast-kit"
                />
              ) : null}
              <button
                ref={closeButtonRef}
                type="button"
                className="ref-preview-drawer-close"
                onClick={onClose}
                aria-label="Close game preview"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>

          <GameSlatePreviewErrorBoundary onReset={onClose}>
            <div className="ref-preview-drawer-body">
              {awaitingCrew ? (
                <section
                  className="ref-preview-drawer-section game-slate-preview-matchup-briefing"
                  aria-label="Matchup briefing"
                >
                  <h3 className="ref-preview-drawer-section-title">
                    {briefing?.headline ?? "Matchup briefing"}
                  </h3>
                  <p className="game-slate-preview-matchup-briefing-note">
                    Officiating crew not assigned yet. Ref intelligence unlocks when the slate is
                    published.
                  </p>
                  {briefing?.lines?.length ? (
                    <ul className="game-slate-preview-matchup-briefing-lines">
                      {briefing.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : safePreview.insufficientSample || !projectionEvidence ? (
                <p className="ref-preview-drawer-summary-copy">{insufficientCopy}</p>
              ) : (
                <MatchupPreviewTerminal
                  preview={safePreview}
                  evidence={projectionEvidence}
                />
              )}
            </div>
          </GameSlatePreviewErrorBoundary>
        </aside>
      </div>
    </ModalPortal>
  );
}
