import type { ReactNode } from "react";

/**
 * Clinical Modern ref card standard for Ref Watch league hubs.
 *
 * MUST apply to all league hubs (NBA, NFL, NHL, EPL, La Liga, CBB, CFB):
 * - tabular-nums on all primary metrics
 * - Semantic color-coding on comparative deltas, not contextual percentages
 * - Glass-morphism card surfaces (.ref-card, .rankings-insight-card)
 */
export const REF_CARD_CLASS =
  "ref-card rankings-insight-card highlight-stat-card";
export const REF_CARD_HEAD_CLASS = "ref-card-head rankings-insight-card-head";
export const REF_CARD_ICON_CLASS = "ref-card-icon rankings-insight-icon";
export const REF_CARD_KICKER_CLASS = "ref-card-kicker rankings-insight-kicker";
export const REF_CARD_METRIC_CLASS =
  "ref-card-metric rankings-insight-metric tabular-nums";
export const REF_CARD_METRIC_LABEL_CLASS = "ref-card-metric-label finding-metric-label";
export const REF_CARD_METRIC_DETAIL_CLASS =
  "ref-card-metric-detail finding-metric-detail finding-metric-detail--muted tabular-nums";
export const REF_CARD_BODY_CLASS = "ref-card-body rankings-insight-body";

export function RefCard({
  className = "",
  children,
  ...dataAttrs
}: {
  className?: string;
  children: ReactNode;
  "data-league"?: string;
  "data-insight"?: string;
  "data-accent"?: string;
  "data-tone"?: string;
}) {
  return (
    <li className={`${REF_CARD_CLASS} ${className}`.trim()} {...dataAttrs}>
      {children}
    </li>
  );
}
