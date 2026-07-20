import { InsightBadge } from "@/components/hub/InsightBadge";

/** Statistically notable profile signal badge. */
export function NotableInsightBadge({ className = "" }: { className?: string }) {
  return <InsightBadge label="Notable" className={className} />;
}
