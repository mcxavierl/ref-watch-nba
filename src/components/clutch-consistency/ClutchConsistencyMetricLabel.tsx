"use client";

import { AccessibleHeaderTooltip } from "@/components/shared/AccessibleHeaderTooltip";
import {
  CLUTCH_CONSISTENCY_INDEX_LABEL,
  CLUTCH_CONSISTENCY_TOOLTIP,
} from "@/lib/clutch-consistency-index";

export function ClutchConsistencyMetricLabel() {
  return (
    <AccessibleHeaderTooltip
      label={CLUTCH_CONSISTENCY_INDEX_LABEL}
      tooltip={CLUTCH_CONSISTENCY_TOOLTIP}
      className="cci-metric-label"
    />
  );
}
