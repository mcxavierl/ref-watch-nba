"use client";

import { RefCompareCombobox } from "@/components/RefCompareCombobox";
import { Pill } from "@/components/ui/Pill";
import type { CompareRefPickerEntry } from "@/lib/ref-compare";
import type { LeagueId } from "@/lib/leagues";
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
  leftEntries,
  rightEntries,
  leftKey,
  rightKey,
  scopeMode,
  leagueHint,
  onLeftChange,
  onRightChange,
  onScopeChange,
  onSwap,
}: {
  leftEntries: CompareRefPickerEntry[];
  rightEntries: CompareRefPickerEntry[];
  leftKey: string;
  rightKey: string;
  scopeMode: SeasonScopeMode;
  leagueHint?: LeagueId | null;
  onLeftChange: (key: string) => void;
  onRightChange: (key: string) => void;
  onScopeChange: (mode: SeasonScopeMode) => void;
  onSwap: () => void;
}) {
  return (
    <div className="ref-compare-controls">
      <div className="ref-compare-selection-row">
        <div className="ref-compare-slot w-full md:w-1/2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <RefCompareCombobox
            id="compare-ref-a"
            label="Official A"
            entries={leftEntries}
            value={leftKey}
            onChange={onLeftChange}
            leagueHint={leagueHint}
            autoFocus={Boolean(leagueHint && !leftKey)}
          />
        </div>

        <div className="ref-compare-swap-axis">
          <button
            type="button"
            className="ref-compare-swap-icon-btn flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-100 transition-all hover:bg-slate-700"
            onClick={onSwap}
            disabled={!leftKey && !rightKey}
            aria-label="Swap officials"
            title="Swap officials"
          >
            <SwapIcon />
          </button>
        </div>

        <div className="ref-compare-slot w-full md:w-1/2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <RefCompareCombobox
            id="compare-ref-b"
            label="Official B"
            entries={rightEntries}
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
          <Pill
            key={mode}
            as="button"
            variant="insight"
            active={scopeMode === mode}
            onClick={() => onScopeChange(mode)}
            aria-pressed={scopeMode === mode}
          >
            {seasonScopeLabel(mode)}
          </Pill>
        ))}
      </div>
    </div>
  );
}
