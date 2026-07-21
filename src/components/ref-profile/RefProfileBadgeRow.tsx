import type { ReactNode } from "react";
import {
  semanticBadgeSurfaceClass,
  type SemanticBadgeRole,
} from "@/lib/semantic-badge-colors";

type RefProfileBadgeRowProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Horizontal flex-wrap row for archetype, crew role, league, and status pills. */
export function RefProfileBadgeRow({
  children,
  className = "",
  "aria-label": ariaLabel,
}: RefProfileBadgeRowProps) {
  return (
    <div
      className={`ref-profile-badge-row flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

const TONE_TO_ROLE: Record<
  "neutral" | "positive" | "negative" | "caution",
  SemanticBadgeRole | "negative"
> = {
  positive: "confidence",
  negative: "negative",
  caution: "anomaly",
  neutral: "baseline",
};

export function RefProfileBadgePill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "caution";
  className?: string;
}) {
  const role = TONE_TO_ROLE[tone];
  const surfaceClass =
    role === "negative"
      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      : semanticBadgeSurfaceClass(role);

  return (
    <span
      className={`ref-profile-badge-pill text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${surfaceClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
