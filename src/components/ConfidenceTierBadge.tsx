import {
  confidenceTierClass,
  type ConfidenceTier,
} from "@/lib/user-language";

export function ConfidenceTierBadge({
  tier,
  className = "",
}: {
  tier: ConfidenceTier;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ${confidenceTierClass(tier)} ${className}`.trim()}
    >
      {tier}
    </span>
  );
}
