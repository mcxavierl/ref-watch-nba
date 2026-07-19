"use client";

import { BarChart3 } from "lucide-react";

export function EmptyState({
  message = "No data available for this range",
  onReset,
  resetLabel = "Reset View",
  className,
}: {
  message?: string;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`stat-empty-state${className ? ` ${className}` : ""}`}
      role="status"
    >
      <BarChart3 className="stat-empty-state-icon" aria-hidden />
      <p className="stat-empty-state-message">{message}</p>
      {onReset ? (
        <button
          type="button"
          className="stat-empty-state-reset rw-focus-ring"
          onClick={onReset}
        >
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}
