import {
  confidenceTierClass,
  type ConfidenceTier,
} from "@/lib/user-language";

export function ConfidenceTierBadge({ tier }: { tier: ConfidenceTier }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ring-1 ${confidenceTierClass(tier)}`}
    >
      {tier}
    </span>
  );
}
