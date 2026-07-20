import type { ReactNode } from "react";

/** Sample size counts in GSNI surfaces: pure white, semi-bold. */
export function GsniSampleCount({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`gsni-sample-count tabular-nums ${className}`.trim()}
    >
      {children}
    </span>
  );
}
