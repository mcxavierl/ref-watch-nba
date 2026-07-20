"use client";

import type { ReactNode } from "react";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";

export function ScoutingWhistleTooltipLabel({
  hint,
  children,
}: {
  hint: string;
  children: ReactNode;
}) {
  return (
    <MetricInfoHint hint={hint} className="scouting-whistle-tooltip-label">
      {children}
    </MetricInfoHint>
  );
}
