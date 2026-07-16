import { DataMaturityBar } from "@/components/shared/DataMaturityBar";

type InsightDataMaturityBarProps = {
  score: number;
  compact?: boolean;
};

/**
 * Insight card wrapper: score is treated as sample size (games) for maturity percent.
 */
export function InsightDataMaturityBar({
  score,
  compact = false,
}: InsightDataMaturityBarProps) {
  return <DataMaturityBar sampleSize={score} compact={compact} />;
}

/** @deprecated Use InsightDataMaturityBar */
export function InsightConfidenceBar(props: InsightDataMaturityBarProps) {
  return <InsightDataMaturityBar {...props} />;
}
