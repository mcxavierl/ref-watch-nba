import { Activity, ShieldCheck, SignalLow, type LucideIcon } from "lucide-react";
import {
  confidenceTierClass,
  type ConfidenceTier,
} from "@/lib/user-language";

const CONFIDENCE_TIER_ICONS: Record<ConfidenceTier, LucideIcon> = {
  Strong: ShieldCheck,
  Moderate: Activity,
  Thin: SignalLow,
};

export function ConfidenceTierBadge({
  tier,
  className = "",
}: {
  tier: ConfidenceTier;
  className?: string;
}) {
  const Icon = CONFIDENCE_TIER_ICONS[tier];

  return (
    <span
      className={`pill-constrain inline-flex min-w-0 items-center gap-1 ${confidenceTierClass(tier)} ${className}`.trim()}
      aria-label={`${tier} confidence`}
    >
      <Icon className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="pill-constrain-text">{tier}</span>
    </span>
  );
}
