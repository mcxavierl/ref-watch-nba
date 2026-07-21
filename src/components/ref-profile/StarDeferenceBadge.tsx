"use client";

import {
  RefProfileBadgePill,
  RefProfileBadgeRow,
} from "@/components/ref-profile/RefProfileBadgeRow";
import { GlossaryMetricLabel } from "@/components/shared/MetricTermLabel";
import { semanticImpactTextClass } from "@/lib/semantic-impact";
import type { StarTreatmentAnalytics } from "@/lib/types";

type StarDeferenceBadgeProps = {
  analytics: StarTreatmentAnalytics;
  className?: string;
};

export function StarDeferenceBadge({
  analytics,
  className = "",
}: StarDeferenceBadgeProps) {
  if (
    analytics.star_deference_index === null ||
    analytics.star_deference_index === undefined ||
    !analytics.star_deference_display
  ) {
    return null;
  }

  const toneClass = semanticImpactTextClass(analytics.star_deference_index, {
    minAbsDelta: 0.4,
  });

  return (
    <RefProfileBadgeRow
      aria-label="Star deference metric"
      className={className}
    >
      <GlossaryMetricLabel id="star-deference">
        <RefProfileBadgePill
          tone={
            analytics.star_deference_index >= 0.75
              ? "positive"
              : analytics.star_deference_index <= -0.75
                ? "negative"
                : "neutral"
          }
          className={`tabular-nums ${toneClass}`}
        >
          Star Deference: {analytics.star_deference_display}
        </RefProfileBadgePill>
      </GlossaryMetricLabel>
    </RefProfileBadgeRow>
  );
}
