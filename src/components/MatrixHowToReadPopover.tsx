"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  MATRIX_EXTREME_DELTA_PTS,
  MATRIX_TONE_DELTA_PTS,
  TEAM_MATRIX_REF_PANEL_LIMIT,
} from "@/lib/ref-team-matrix";

type MatrixHowToReadPopoverProps = {
  minGames: number;
  className?: string;
};

export function MatrixHowToReadPopover({
  minGames,
  className = "",
}: MatrixHowToReadPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`matrix-how-to-read${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="matrix-how-to-read-trigger rw-focus-ring"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="How to read this matrix"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp aria-hidden />
        <span>How to read</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className="matrix-how-to-read-panel"
        >
          <p>
            Each cell is that official&apos;s ref×team split (not the team&apos;s overall
            record). The baseline row under each logo is the team sample for coloring only.
            Qualified cells need {minGames}+ games; thinner samples stay muted. Heat intensity
            reflects win-rate delta vs baseline (±{MATRIX_TONE_DELTA_PTS} pts for tint; ±
            {MATRIX_EXTREME_DELTA_PTS} pts for standout outliers). Hover a cell for the exact
            delta. Click a team logo to drill into favorable and unfavorable officials (top{" "}
            {TEAM_MATRIX_REF_PANEL_LIMIT} each). Historical splits only — not picks.
          </p>
          <div className="matrix-how-to-read-swatches" aria-hidden>
            <span className="matrix-how-to-read-swatch matrix-how-to-read-swatch--positive">
              Above baseline
            </span>
            <span className="matrix-how-to-read-swatch matrix-how-to-read-swatch--neutral">
              Near baseline
            </span>
            <span className="matrix-how-to-read-swatch matrix-how-to-read-swatch--negative">
              Below baseline
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
