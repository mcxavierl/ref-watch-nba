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
      className={`gsni-card rounded-xl border bg-slate-900 p-4 ${
        variant === "soft-lock"
          ? "gsni-card--soft-lock border-dashed border-indigo-900/50 bg-indigo-950/20"
          : "border-slate-800"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
