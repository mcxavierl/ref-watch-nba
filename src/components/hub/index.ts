/**
 * Clinical Modern hub component exports.
 * Prop-driven status indicators and provenance metadata for all league hubs.
 */
export {
  ClinicalCard,
  CLINICAL_CARD_CLASS,
} from "@/components/hub/ClinicalCard";
export {
  RefCard,
  REF_CARD_BODY_CLASS,
  REF_CARD_CLASS,
  REF_CARD_HEAD_CLASS,
  REF_CARD_ICON_CLASS,
  REF_CARD_KICKER_CLASS,
  REF_CARD_METRIC_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  REF_CARD_METRIC_LABEL_CLASS,
  STAT_COMPARISON_CLASS,
  StatComparison,
} from "@/components/hub/RefCard";
export { FooterLeaders } from "@/components/hub/FooterLeaders";
export { StatCard, type StatCardProps } from "@/components/StatCard";
export { StatCardShareButton } from "@/components/StatCardShareButton";
export {
  ClinicalMetricCard,
  CLINICAL_METRIC_CARD_CLASS,
} from "@/components/hub/ClinicalMetricCard";
export {
  ProvenanceIndicator,
  type ProvenanceIndicatorProps,
} from "@/components/hub/ProvenanceIndicator";
export {
  StatusBadge,
  badgeToneToVerdict,
  type StatusBadgeProps,
  type StatusBadgeVerdict,
} from "@/components/hub/StatusBadge";
