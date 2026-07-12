"use client";

import {
  SEASON_SCOPE_MODES,
  NFL_SEASON_SCOPE_MODES,
  seasonScopeLabel,
  seasonScopeLabelForSeasons,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { LeagueId } from "@/lib/leagues";
import { useSeasonScope } from "@/hooks/useSeasonScope";

type SeasonScopeToggleProps = {
  className?: string;
  /** Controlled mode (optional — defaults to URL sync). */
  mode?: SeasonScopeMode;
  onChange?: (mode: SeasonScopeMode) => void;
  /** Full season pool for honest toggle labels (e.g. last10 with 5 seasons → "Last 5 seasons"). */
  availableSeasons?: string[];
  /** Override pill set (defaults to standard three-mode toggle). */
  modes?: SeasonScopeMode[];
  /** When set, NFL gets decade buckets by default. */
  leagueId?: LeagueId;
};

export function SeasonScopeToggle({
  className = "",
  mode: controlledMode,
  onChange,
  availableSeasons,
  modes,
  leagueId,
}: SeasonScopeToggleProps) {
  const { mode: urlMode, setMode } = useSeasonScope(leagueId);
  const mode = controlledMode ?? urlMode;
  const options =
    modes ??
    (leagueId === "nfl" ? NFL_SEASON_SCOPE_MODES : SEASON_SCOPE_MODES);

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
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`refs-directory-metric-btn${mode === option ? " refs-directory-metric-btn-active" : ""}`}
          aria-pressed={mode === option}
          onClick={() => handleSelect(option)}
        >
          {availableSeasons
            ? seasonScopeLabelForSeasons(option, availableSeasons)
            : seasonScopeLabel(option)}
        </button>
      ))}
    </div>
  );
}
