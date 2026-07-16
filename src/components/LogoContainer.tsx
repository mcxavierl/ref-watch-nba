import type { ReactNode } from "react";

export type LogoContainerSize = "sm" | "lg";

const SIZE_CLASS: Record<LogoContainerSize, string> = {
  sm: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * Shared league logo plate: equal visual weight in header and hub cards.
 * Light: slate-50 plate + slate-200 ring. Dark: elevated plate via CSS.
 */
export function LogoContainer({
  children,
  className = "",
  size = "sm",
}: {
  children?: ReactNode;
  className?: string;
  size?: LogoContainerSize;
}) {
  return (
    <span
      className={`logo-container inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 ${SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden={children ? undefined : true}
    >
      {children}
    </span>
  );
}
