"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FOUL_VIEW_OPTIONS, type FoulView } from "@/lib/foul-view";

export type FoulViewToggleProps = {
  value: FoulView;
  onChange: (view: FoulView) => void;
  className?: string;
};

/** Headless segmented control for All / Subjective / Admin foul views. */
export function FoulViewToggle({
  value,
  onChange,
  className = "",
}: FoulViewToggleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`foul-view-toggle ${className}`.trim()}
      role="group"
      aria-label="Foul view"
    >
      <div className="foul-view-toggle-track">
        {FOUL_VIEW_OPTIONS.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              className={`foul-view-toggle-btn text-sm tabular-nums${isActive ? " foul-view-toggle-btn-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
            >
              {isActive && !reduceMotion ? (
                <motion.span
                  layoutId="foul-view-active-pill"
                  className="foul-view-toggle-indicator"
                  transition={{
                    type: "spring",
                    stiffness: 520,
                    damping: 38,
                    mass: 0.75,
                  }}
                />
              ) : isActive ? (
                <span className="foul-view-toggle-indicator" aria-hidden />
              ) : null}
              <span className="foul-view-toggle-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
