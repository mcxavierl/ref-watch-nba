"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";

type AccessibleHeaderTooltipProps = {
  label: string;
  tooltip: string;
  className?: string;
};

/**
 * Touch-friendly column header tooltip: tap or hover to reveal help copy.
 */
export function AccessibleHeaderTooltip({
  label,
  tooltip,
  className = "",
}: AccessibleHeaderTooltipProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

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
    <span
      ref={rootRef}
      className={`accessible-header-tooltip${className ? ` ${className}` : ""}`}
    >
      <span>{label}</span>
      <button
        type="button"
        className="accessible-header-tooltip-trigger rw-focus-ring"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`About ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp aria-hidden />
      </button>
      {open ? (
        <span id={panelId} role="tooltip" className="accessible-header-tooltip-panel">
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
