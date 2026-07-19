"use client";

import { Pill } from "@/components/ui/Pill";

export function MarqueeOnlyToggle({
  active,
  onToggle,
  className = "",
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Pill
      as="button"
      variant="insight"
      active={active}
      onClick={onToggle}
      aria-pressed={active}
      className={`marquee-only-toggle ${className}`.trim()}
      title="Show only games with Leverage Index above 75"
    >
      Marquee Only
    </Pill>
  );
}

export const MARQUEE_ONLY_EMPTY_COPY =
  "No high-leverage matchups currently on the slate.";
