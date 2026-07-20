/**
 * Terminal-grade state colors for risk, stability, and neutral metrics.
 * Values resolve to CSS custom properties defined in theme-tokens.css.
 */
export const STATE_COLORS = {
  VOLATILE_RED: "var(--state-volatile)",
  STABLE_GREEN: "var(--state-stable)",
  NEUTRAL_BLUE: "var(--state-neutral)",
  CAUTION_AMBER: "var(--state-caution)",
  RISK: "var(--state-risk)",
} as const;

export type StateColorToken = keyof typeof STATE_COLORS;

/** Tailwind-safe utility class names backed by terminal-integrity.css */
export const STATE_COLOR_CLASS = {
  volatile: "state-color-volatile",
  stable: "state-color-stable",
  neutral: "state-color-neutral",
  caution: "state-color-caution",
  risk: "state-color-risk",
} as const;

export type StateColorClass = (typeof STATE_COLOR_CLASS)[keyof typeof STATE_COLOR_CLASS];

export function consistencyStateClass(score: number): StateColorClass {
  if (score <= 4) return STATE_COLOR_CLASS.volatile;
  if (score >= 7) return STATE_COLOR_CLASS.stable;
  return STATE_COLOR_CLASS.neutral;
}

export function deltaStateClass(delta: number): StateColorClass {
  if (delta > 0) return STATE_COLOR_CLASS.stable;
  if (delta < 0) return STATE_COLOR_CLASS.risk;
  return STATE_COLOR_CLASS.neutral;
}
