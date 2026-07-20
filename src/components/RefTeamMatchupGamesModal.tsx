"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { ModalPortal } from "@/components/ModalPortal";
import { X } from "lucide-react";
import { InsightDrilldownPanel } from "@/components/InsightDrilldownPanel";
import { buildClientRefTeamMatchupPayload } from "@/lib/ref-team-matchup-games-client";
import type { RefTeamMatchupInput } from "@/lib/ref-team-matchup-games-client";
import type { LeagueId } from "@/lib/leagues";

const MODAL_TRANSITION_MS = 200;

export type RefTeamMatchupTarget = {
  leagueId: LeagueId;
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  recordWins?: number;
  recordLosses?: number;
  baselineWinRate: number;
  leagueAvgFouls?: number;
};

type RefTeamMatchupGamesModalProps = {
  target: RefTeamMatchupTarget | null;
  open: boolean;
  onClose: () => void;
};

export function RefTeamMatchupGamesModal({
  target,
  open,
  onClose,
}: RefTeamMatchupGamesModalProps) {
  const titleId = useId();
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
    const timer = window.setTimeout(() => setRendered(false), MODAL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!rendered) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rendered, onClose]);

  const payload = useMemo(() => {
    if (!target) return null;
    const input: RefTeamMatchupInput = {
      leagueId: target.leagueId,
      refSlug: target.refSlug,
      refName: target.refName,
      teamAbbr: target.teamAbbr,
      teamLabel: target.teamLabel,
      recordWins: target.recordWins,
      recordLosses: target.recordLosses,
      baselineWinRate: target.baselineWinRate,
      leagueAvgFouls: target.leagueAvgFouls,
    };
    return buildClientRefTeamMatchupPayload(input);
  }, [target]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!rendered) return null;

  const modal = (
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm",
        "insight-drilldown-backdrop",
        visible ? "insight-drilldown-backdrop--visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={`insight-drilldown-modal${visible ? " insight-drilldown-modal--visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-league={target?.leagueId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="insight-drilldown-header">
          <div className="insight-drilldown-header-copy">
            <p className="insight-drilldown-kicker">Ref×team games</p>
            <h2 className="insight-drilldown-title" id={titleId}>
              {target?.refName ?? "Official"} ×{" "}
              {target?.teamLabel ?? target?.teamAbbr ?? "Team"}
            </h2>
          </div>
          <button
            type="button"
            className="insight-drilldown-close"
            onClick={onClose}
            aria-label="Close game list"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {!payload ? (
          <p className="insight-drilldown-status">
            No verified games found for this ref×team pair in the current sample.
          </p>
        ) : (
          <InsightDrilldownPanel
            payload={payload}
            titleId={titleId}
            gamesSectionTitle={`All ${payload.games.length} games`}
          />
        )}
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
