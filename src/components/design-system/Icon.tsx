import { forwardRef, type ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";

/** Semantic stroke colours mapped to design tokens. */
export type IconTone =
  | "primary"
  | "secondary"
  | "muted"
  | "brand"
  | "positive"
  | "negative"
  | "inverse"
  | "inherit";

const toneClass: Record<IconTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  muted: "text-muted",
  brand: "text-accent-brand",
  positive: "text-accent-positive",
  negative: "text-accent-negative",
  inverse: "text-inverse",
  inherit: "",
};

export type IconProps = {
  icon: LucideIcon;
  /** Accessible name — when set, icon becomes interactive (role + aria-label). */
  label?: string;
  tone?: IconTone;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"svg">, "children" | "color">;

/**
 * Accessible Lucide wrapper.
 * - Decorative icons: omit `label` → `aria-hidden="true"`.
 * - Interactive icons: pass `label` → `role="img"` + `aria-label`.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    icon: LucideIcon,
    label,
    tone = "muted",
    size = "1em",
    strokeWidth = 2,
    className = "",
    ...rest
  },
  ref,
) {
  const toneCls = toneClass[tone];
  const isInteractive = Boolean(label);

  return (
    <LucideIcon
      ref={ref}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={[toneCls, "shrink-0", className].filter(Boolean).join(" ")}
      aria-hidden={isInteractive ? undefined : true}
      aria-label={isInteractive ? label : undefined}
      role={isInteractive ? "img" : undefined}
      {...rest}
    />
  );
});

Icon.displayName = "Icon";
