import type { CSSProperties, ReactNode } from "react";
import { CLINICAL_CARD_CLASS } from "@/components/hub/ClinicalCard";

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 *
 * Ref card shell for league hubs (NBA, NFL, NHL, EPL, La Liga, CBB, CFB):
 * - tabular-nums on all primary metrics
 * - Semantic red/green reserved for betting-market deltas (O/U, ATS), not league baselines
 * - Glass-morphism card surfaces (.ref-card, .rankings-insight-card, .clinical-card)
 * - Muted comparative copy via --text-primary-muted
 *
 * Design tokens: figma/design-tokens.json and src/app/globals.css
 */
export const REF_CARD_CLASS =
  `ref-card rankings-insight-card highlight-stat-card ${CLINICAL_CARD_CLASS}`;
export const REF_CARD_HEAD_CLASS = "ref-card-head rankings-insight-card-head";
export const REF_CARD_ICON_CLASS = "ref-card-icon rankings-insight-icon";
export const REF_CARD_KICKER_CLASS = "ref-card-kicker rankings-insight-kicker";
export const REF_CARD_METRIC_CLASS =
  "ref-card-metric rankings-insight-metric tabular-nums";
export const REF_CARD_METRIC_LABEL_CLASS = "ref-card-metric-label finding-metric-label";
export const REF_CARD_METRIC_DETAIL_CLASS =
  "ref-card-metric-detail finding-metric-detail finding-metric-detail--muted tabular-nums";
export const REF_CARD_BODY_CLASS = "ref-card-body rankings-insight-body";
export const STAT_COMPARISON_CLASS =
  "stat-comparison finding-metric-detail finding-metric-detail--muted tabular-nums text-primary-muted";

/** Neutral league-baseline comparison line (never semantic green/red). */
export function StatComparison({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${STAT_COMPARISON_CLASS} ${className}`.trim()}>{children}</span>
  );
}

export function RefCard({
  id,
  className = "",
  children,
  style,
  ...dataAttrs
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  "data-league"?: string;
  "data-insight"?: string;
  "data-accent"?: string;
  "data-tone"?: string;
}) {
  return (
    <li
      id={id}
      data-stat-card={id ? "true" : undefined}
      className={`${REF_CARD_CLASS} stat-card ${className}`.trim()}
      style={style}
      {...dataAttrs}
    >
      {children}
    </li>
  );
}
