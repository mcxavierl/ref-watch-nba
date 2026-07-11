"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function GameSlateBreakdown({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = `${triggerId}-panel`;

  return (
    <div className="game-slate-breakdown border-t border-border-subtle">
      <h4 className="game-slate-breakdown-heading">
        <button
          type="button"
          id={triggerId}
          className="game-slate-breakdown-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          View breakdown
          <ChevronDown
            className={`game-slate-breakdown-chevron${open ? " game-slate-breakdown-chevron--open" : ""}`}
            aria-hidden
          />
        </button>
      </h4>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className="game-slate-breakdown-panel"
        hidden={!open}
      >
        <div className="game-slate-breakdown-body">{children}</div>
      </div>
    </div>
  );
}
