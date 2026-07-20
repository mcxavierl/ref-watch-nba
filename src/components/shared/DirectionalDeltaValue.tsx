import type { ReactNode } from "react";
import { inferKpiTone, type KpiDataPillTone } from "@/components/ui/KpiDataPill";
import { kpiToneStateClass } from "@/constants/colors";

const SIZE_CLASS = {
  sm: "text-lg font-bold",
  md: "text-2xl font-bold",
  lg: "text-3xl font-bold",
} as const;

function directionIcon(tone: KpiDataPillTone): string | null {
  if (tone === "positive") return "▲";
  if (tone === "negative") return "▼";
  return null;
}

export function deltaToneFromValue(value: string): KpiDataPillTone {
  return inferKpiTone(value);
}

export function DirectionalDeltaValue({
  value,
  tone,
  size = "lg",
  className = "",
  suffix,
}: {
  value: string;
  tone?: KpiDataPillTone;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  suffix?: ReactNode;
}) {
  const resolvedTone = tone ?? deltaToneFromValue(value);
  const icon = directionIcon(resolvedTone);

  return (
    <span
      className={`insight-split-delta-value insight-split-delta-value--${resolvedTone} inline-flex items-baseline gap-2 tabular-nums tracking-tight ${SIZE_CLASS[size]} ${kpiToneStateClass(resolvedTone)} ${className}`.trim()}
      aria-label={
        resolvedTone === "positive"
          ? `${value}, positive change`
          : resolvedTone === "negative"
            ? `${value}, negative change`
            : value
      }
    >
      {icon ? (
        <span className="insight-split-delta-icon text-[0.55em] leading-none" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{value}</span>
      {suffix ? <span className="text-[0.55em] font-semibold">{suffix}</span> : null}
    </span>
  );
}
