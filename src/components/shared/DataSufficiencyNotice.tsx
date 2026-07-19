"use client";

import { Info } from "lucide-react";
import {
  DATA_SUFFICIENCY_EXPANDED_NOTE,
  DATA_SUFFICIENCY_GSNI_EXPANDED_NOTE,
} from "@/lib/data-sufficiency";

type DataSufficiencyNoticeProps = {
  showAll: boolean;
  hiddenCount: number;
  onExpand: () => void;
  expandedNote?: string;
  className?: string;
};

export function DataSufficiencyNotice({
  showAll,
  hiddenCount,
  onExpand,
  expandedNote = DATA_SUFFICIENCY_EXPANDED_NOTE,
  className = "",
}: DataSufficiencyNoticeProps) {
  if (hiddenCount <= 0) return null;

  return (
    <div
      className={`data-sufficiency-notice flex flex-wrap items-start gap-2 text-sm text-slate-400 ${className}`.trim()}
      role="status"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 leading-relaxed">
          Showing officials with sufficient data.
          {!showAll ? (
            <>
              {" "}
              <button
                type="button"
                className="data-sufficiency-notice-expand font-medium text-slate-200 underline-offset-2 hover:underline"
                onClick={onExpand}
              >
                Expand List
              </button>
            </>
          ) : null}
        </p>
        {showAll ? (
          <p className="data-sufficiency-notice-detail m-0 mt-1 leading-relaxed text-slate-500">
            {expandedNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type DataSufficiencyToggleProps = {
  showAll: boolean;
  hiddenCount: number;
  onToggle: () => void;
  officialLabel?: string;
  className?: string;
};

export function DataSufficiencyToggle({
  showAll,
  hiddenCount,
  onToggle,
  officialLabel = "officials",
  className = "",
}: DataSufficiencyToggleProps) {
  if (hiddenCount <= 0) return null;

  return (
    <div className={`data-sufficiency-toggle-wrap ${className}`.trim()}>
      <button
        type="button"
        className="data-sufficiency-toggle-btn rw-focus-ring"
        aria-pressed={showAll}
        onClick={onToggle}
      >
        {showAll ? "Show sufficient data only" : `Show all ${officialLabel}`}
      </button>
    </div>
  );
}

export { DATA_SUFFICIENCY_GSNI_EXPANDED_NOTE };
