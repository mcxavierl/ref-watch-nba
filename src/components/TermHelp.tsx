"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GLOSSARY, type GlossaryId } from "@/lib/glossary";

export function TermHelp({
  id,
  children,
  className = "",
}: {
  id: GlossaryId;
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[id];
  const label = children ?? entry.label;
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`term-help ${className}`.trim()}>
      <button
        type="button"
        className="term-help-trigger border-b border-dotted border-zinc-400"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`term-help-tooltip${open ? " term-help-tooltip-open" : ""}`}
      >
        {entry.text}
      </span>
      <span className="term-help-mobile">{entry.text}</span>
    </span>
  );
}

/** Section heading with glossary term as the label. */
export function TermHeading({
  id,
  as: Component = "h2",
  className = "text-sm font-semibold text-zinc-800",
}: {
  id: GlossaryId;
  as?: "h2" | "h3" | "p";
  className?: string;
}) {
  return (
    <Component className={className}>
      <TermHelp id={id} />
    </Component>
  );
}
