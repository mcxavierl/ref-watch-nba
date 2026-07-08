"use client";

import {
  SEASON_SCOPE_MODES,
  seasonScopeLabel,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import { useSeasonScope } from "@/hooks/useSeasonScope";

type SeasonScopeToggleProps = {
  className?: string;
  /** Controlled mode (optional — defaults to URL sync). */
  mode?: SeasonScopeMode;
  onChange?: (mode: SeasonScopeMode) => void;
};

export function SeasonScopeToggle({
  className = "",
  mode: controlledMode,
  onChange,
}: SeasonScopeToggleProps) {
  const { mode: urlMode, setMode } = useSeasonScope();
  const mode = controlledMode ?? urlMode;

  function handleSelect(next: SeasonScopeMode) {
    if (onChange) {
      onChange(next);
    } else {
      setMode(next);
    }
  }

  return (
    <div
      className={`refs-directory-metric-toggle season-scope-toggle ${className}`.trim()}
      role="group"
      aria-label="Season scope"
    >
      {SEASON_SCOPE_MODES.map((option) => (
        <button
          key={option}
          type="button"
          className={`refs-directory-metric-btn${mode === option ? " refs-directory-metric-btn-active" : ""}`}
          aria-pressed={mode === option}
          onClick={() => handleSelect(option)}
        >
          {seasonScopeLabel(option)}
        </button>
      ))}
    </div>
  );
}
