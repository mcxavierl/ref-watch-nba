"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { PortaledHintPanel } from "@/components/ui/PortaledHintPanel";

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
        const panel = document.getElementById(panelId);
        if (panel?.contains(event.target as Node)) return;
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
  }, [open, panelId]);

  return (
    <span
      ref={rootRef}
      className={`accessible-header-tooltip${className ? ` ${className}` : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
      <PortaledHintPanel
        anchorRef={rootRef}
        open={open}
        id={panelId}
        className="accessible-header-tooltip-panel"
      >
        {tooltip}
      </PortaledHintPanel>
    </span>
  );
}
