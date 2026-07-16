"use client";

import { TouchPopover } from "@/components/ui/TouchPopover";

const PRELIMINARY_DATA_HINT =
  "Sample below 15 games; delta is a calculated projection";

type PreliminaryDataBadgeProps = {
  compact?: boolean;
  className?: string;
};

export function PreliminaryDataBadge({
  compact = false,
  className = "",
}: PreliminaryDataBadgeProps) {
  const badgeClass = [
    "preliminary-data-badge",
    compact ? "preliminary-data-badge--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TouchPopover
      className="preliminary-data-badge-popover"
      panelClassName="preliminary-data-badge-panel"
      ariaLabel={PRELIMINARY_DATA_HINT}
      desktopHover={false}
      trigger={<span className={badgeClass}>Preliminary Data</span>}
    >
      {PRELIMINARY_DATA_HINT}
    </TouchPopover>
  );
}
