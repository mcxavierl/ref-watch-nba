import type { ReactNode } from "react";

export type KpiDataPillTone = "positive" | "negative" | "neutral";
export type KpiDataPillVariant = "block" | "inline" | "compact";
export type KpiDataPillAccent = "emerald" | "rose" | "amber" | "sky";

function accentToTone(accent: KpiDataPillAccent): KpiDataPillTone {
  if (accent === "emerald") return "positive";
  if (accent === "rose") return "negative";
  return "neutral";
}

/** Infer directional tone from a signed KPI string (e.g. "+57.8pp", "-0.9"). */
export function inferKpiTone(value: string): KpiDataPillTone {
  const trimmed = value.trim();
  if (trimmed.startsWith("+") && !/^\+0(?:\.0+)?(?:\s|$|pp|%)/.test(trimmed)) {
    return "positive";
  }
  if (trimmed.startsWith("-") && !/^-0(?:\.0+)?(?:\s|$|pp|%)/.test(trimmed)) {
    return "negative";
  }
  return "neutral";
}

export type KpiDataPillProps = {
  value: string;
  tone?: KpiDataPillTone;
  variant?: KpiDataPillVariant;
  label?: ReactNode;
  caption?: ReactNode;
  accent?: KpiDataPillAccent;
  metricPriority?: "primary" | "secondary";
  className?: string;
};

export function KpiDataPill({
  value,
  tone,
  variant = "block",
  label,
  caption,
  accent,
  metricPriority = "primary",
  className = "",
}: KpiDataPillProps) {
  const resolvedTone = tone ?? (accent ? accentToTone(accent) : inferKpiTone(value));
  const isSecondaryInline = variant === "inline" && metricPriority === "secondary";
  const showAccent = resolvedTone !== "neutral" && !isSecondaryInline;

  const rootClass = [
    "kpi-data-pill",
    `kpi-data-pill--${variant}`,
    `kpi-data-pill--${resolvedTone}`,
    isSecondaryInline ? "kpi-data-pill--secondary" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const valueContent = (
    <span className="kpi-data-pill__value">
      {showAccent ? (
        <span className="kpi-data-pill__accent" aria-hidden>
          ●
        </span>
      ) : null}
      {value}
    </span>
  );

  if (variant === "inline") {
    return <span className={rootClass}>{valueContent}</span>;
  }

  if (variant === "compact") {
    return (
      <span className={rootClass}>
        {valueContent}
        {caption ? <span className="kpi-data-pill__caption">{caption}</span> : null}
      </span>
    );
  }

  return (
    <div className={rootClass}>
      {valueContent}
      {label ? <span className="kpi-data-pill__label">{label}</span> : null}
    </div>
  );
}
