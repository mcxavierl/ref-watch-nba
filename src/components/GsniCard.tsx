import type { ReactNode } from "react";

export function GsniCard({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "soft-lock";
}) {
  return (
    <div
      className={`gsni-card rounded-xl border p-4 ${
        variant === "soft-lock" ? "gsni-card--soft-lock border-dashed" : ""
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
