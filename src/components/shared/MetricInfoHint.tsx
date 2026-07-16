"use client";

import type { ReactNode } from "react";
import { TouchPopover } from "@/components/ui/TouchPopover";

type MetricInfoHintProps = {
  hint: string;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
};

export function MetricInfoHint({
  hint,
  children,
  className = "",
  panelClassName = "",
}: MetricInfoHintProps) {
  return (
    <TouchPopover
      className={`metric-info-hint ${className}`.trim()}
      panelClassName={`metric-info-hint-panel ${panelClassName}`.trim()}
      ariaLabel={hint}
      trigger={children}
    >
      {hint}
    </TouchPopover>
  );
}
