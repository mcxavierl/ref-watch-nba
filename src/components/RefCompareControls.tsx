"use client";

import { RefCompareCombobox } from "@/components/RefCompareCombobox";
import type { CompareRefPickerEntry } from "@/lib/ref-compare";
import {
  SEASON_SCOPE_MODES,
  seasonScopeLabel,
  type SeasonScopeMode,
} from "@/lib/season-scope";

function SwapIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M21 16V8a2 2 0 0 0-2-2H5" />
      <path d="M3 8v8a2 2 0 0 0 2 2h14" />
    </svg>
  );
}

export function RefCompareControls({
  entries,
  leftKey,
  rightKey,
  scopeMode,
  onLeftChange,
  onRightChange,
  onScopeChange,
  onSwap,
}: {
  entries: CompareRefPickerEntry[];
  leftKey: string;
  rightKey: string;
  scopeMode: SeasonScopeMode;
  onLeftChange: (key: string) => void;
  onRightChange: (key: string) => void;
  onScopeChange: (mode: SeasonScopeMode) => void;
  onSwap: () => void;
}) {
  return (
    <div className="ref-compare-controls">
      <div className="ref-compare-selection-row">
        <div className="ref-compare-slot w-full md:w-1/2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6">
          <RefCompareCombobox
            id="compare-ref-a"
            label="Official A"
            entries={entries}
            value={leftKey}
            onChange={onLeftChange}
          />
        </div>

        <div className="ref-compare-swap-axis">
          <button
            type="button"
            className="ref-compare-swap-icon-btn flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-white transition-all hover:bg-zinc-700"
            onClick={onSwap}
            disabled={!leftKey && !rightKey}
            aria-label="Swap officials"
            title="Swap officials"
          >
            <SwapIcon />
          </button>
        </div>

        <div className="ref-compare-slot w-full md:w-1/2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-6">
          <RefCompareCombobox
            id="compare-ref-b"
            label="Official B"
            entries={entries}
            value={rightKey}
            onChange={onRightChange}
          />
        </div>
      </div>

      <div
        className="ref-compare-scope-track"
        role="group"
        aria-label="Season scope"
      >
        {SEASON_SCOPE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`ref-compare-scope-btn${
              scopeMode === mode ? " ref-compare-scope-btn--active" : ""
            }`}
            aria-pressed={scopeMode === mode}
            onClick={() => onScopeChange(mode)}
          >
            {seasonScopeLabel(mode)}
          </button>
        ))}
      </div>
    </div>
  );
}
