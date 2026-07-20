"use client";

import { useId, useState, type ReactNode } from "react";

type RefProfileDepthExpandProps = {
  children: ReactNode;
  label?: string;
};

/** Collapses secondary ref-profile depth on mobile; always expanded from md up. */
export function RefProfileDepthExpand({
  children,
  label = "Expand depth stats",
}: RefProfileDepthExpandProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className="ref-profile-depth-expand">
      <button
        type="button"
        className="ref-profile-depth-expand-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Collapse depth stats" : label}
      </button>
      <div
        id={panelId}
        className={`ref-profile-depth-expand-panel${expanded ? " is-expanded" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
