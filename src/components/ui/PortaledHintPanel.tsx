"use client";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type PortaledHintPanelProps = {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  id: string;
  children: ReactNode;
  className?: string;
  placement?: "top" | "bottom";
};

/** Renders hint copy in a fixed-position portal so overflow ancestors cannot clip it. */
export function PortaledHintPanel({
  anchorRef,
  open,
  id,
  children,
  className = "",
  placement = "top",
}: PortaledHintPanelProps) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gap = 8;
      const preferTop = placement === "top" && rect.top > 120;
      const top = preferTop ? rect.top - gap : rect.bottom + gap;
      const transform = preferTop ? "translate(-50%, -100%)" : "translate(-50%, 0)";

      setStyle({
        position: "fixed",
        top,
        left: rect.left + rect.width / 2,
        transform,
        zIndex: 120,
        visibility: "visible",
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef, placement]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id={id}
      role="tooltip"
      className={`portaled-hint-panel ${className}`.trim()}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
