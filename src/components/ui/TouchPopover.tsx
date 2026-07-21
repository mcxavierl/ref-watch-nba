"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PortaledHintPanel } from "@/components/ui/PortaledHintPanel";

export interface TouchPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  panelClassName?: string;
  /** Show panel on hover for fine-pointer devices (desktop). */
  desktopHover?: boolean;
}

export function TouchPopover({
  trigger,
  children,
  ariaLabel,
  className = "",
  panelClassName = "",
  desktopHover = true,
}: TouchPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        const panel = document.getElementById(panelId);
        if (panel?.contains(event.target as Node)) return;
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, panelId]);

  const rootClass = [
    "touch-popover",
    open ? "touch-popover--open" : "",
    desktopHover ? "touch-popover--hoverable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      ref={rootRef}
      className={rootClass}
      onMouseEnter={() => {
        if (desktopHover) setOpen(true);
      }}
      onMouseLeave={() => {
        if (desktopHover) setOpen(false);
      }}
    >
      <button
        type="button"
        className="touch-popover-trigger rw-focus-ring"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      <PortaledHintPanel
        anchorRef={rootRef}
        open={open}
        id={panelId}
        className={`touch-popover-panel ${panelClassName}`.trim()}
      >
        {children}
      </PortaledHintPanel>
    </span>
  );
}
