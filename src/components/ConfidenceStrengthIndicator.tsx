import type { ConfidenceTier } from "@/lib/user-language";
import { confidenceTierClass } from "@/lib/user-language";

export function ConfidenceStrengthIndicator({
  tier,
  className = "",
}: {
  tier: ConfidenceTier;
  className?: string;
}) {
  return (
    <span
      className={`${confidenceTierClass(tier)} ${className}`.trim()}
      aria-label={`${tier} confidence`}
    >
      {tier}
    </span>
  );
}
