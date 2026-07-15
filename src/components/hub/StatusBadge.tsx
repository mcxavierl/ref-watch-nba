import type { ReactNode } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export type StatusBadgeVerdict = "pass" | "fail" | "caution";

export interface StatusBadgeProps {
  verdict: StatusBadgeVerdict;
  label: ReactNode;
  className?: string;
  compact?: boolean;
}

const VERDICT_CONFIG: Record<
  StatusBadgeVerdict,
  { Icon: typeof Check; className: string }
> = {
  pass: {
    Icon: Check,
    className: "status-badge--pass",
  },
  fail: {
    Icon: X,
    className: "status-badge--fail",
  },
  caution: {
    Icon: AlertTriangle,
    className: "status-badge--caution",
  },
};

export function StatusBadge({
  verdict,
  label,
  className = "",
  compact = false,
}: StatusBadgeProps) {
  const { Icon, className: toneClass } = VERDICT_CONFIG[verdict];

  return (
    <span
      className={`status-badge ${toneClass} ${compact ? "status-badge--compact" : ""} ${className}`.trim()}
    >
      <Icon className="status-badge-icon" strokeWidth={2.25} aria-hidden />
      <span className="status-badge-label">{label}</span>
    </span>
  );
}

/** Map legacy badge tones to Clinical Modern status verdicts. */
export function badgeToneToVerdict(
  tone: "positive" | "negative" | "neutral" | "warning",
): StatusBadgeVerdict {
  if (tone === "positive") return "pass";
  if (tone === "negative") return "fail";
  return "caution";
}
