"use client";

import { FOUL_VIEW_OPTIONS, type FoulView } from "@/lib/foul-view";
import { useFoulView } from "@/hooks/useFoulView";

type FoulViewToggleProps = {
  className?: string;
  /** Controlled view (optional - defaults to URL sync via ?view=). */
  view?: FoulView;
  onChange?: (view: FoulView) => void;
};

export function FoulViewToggle({
  className = "",
  view: controlledView,
  onChange,
}: FoulViewToggleProps) {
  const { view: urlView, setView } = useFoulView();
  const view = controlledView ?? urlView;

  function handleSelect(next: FoulView) {
    if (onChange) {
      onChange(next);
      return;
    }
    setView(next);
  }

  return (
    <div
      className={`refs-directory-metric-toggle foul-view-toggle ${className}`.trim()}
      role="group"
      aria-label="Foul view"
    >
      {FOUL_VIEW_OPTIONS.map((option) => {
        const isActive = option.id === view;
        return (
          <button
            key={option.id}
            type="button"
            className={`refs-directory-metric-btn${isActive ? " refs-directory-metric-btn-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => handleSelect(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
