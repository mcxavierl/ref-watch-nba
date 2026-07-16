import type { ReactNode } from "react";
import {
  isDirectionalTone,
  isStandoutTone,
  metricDelightClass,
  type MetricDelightSurface,
  type MetricDelightTone,
} from "@/lib/metric-delight";

export function StandoutMetricValue({
  children,
  tone = "neutral",
  size = "md",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: MetricDelightTone;
  size?: "md" | "lg" | "hero";
  className?: string;
  title?: string;
}) {
  const surface: MetricDelightSurface =
    size === "hero" ? "value-hero" : size === "lg" ? "value" : "value";
  const sizeClass =
    size === "hero"
      ? "metric-delight-value--hero-size"
      : size === "lg"
        ? "metric-delight-value--lg-size"
        : "";

  return (
    <span
      className={`${metricDelightClass(tone, surface)} ${sizeClass} ${className}`.trim()}
      title={title}
    >
      {children}
    </span>
  );
}

export function StandoutMetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: MetricDelightTone;
}) {
  return (
    <span className={metricDelightClass(tone, "badge")}>
      <span className="metric-delight-badge-label">{label}</span>
      <span className={metricDelightClass(tone, "badge-value")}>{value}</span>
    </span>
  );
}

export function StandoutMetricBar({
  label,
  magnitude,
  maxMagnitude,
  tone = "neutral",
}: {
  label: ReactNode;
  magnitude: number;
  maxMagnitude: number;
  tone?: MetricDelightTone;
}) {
  const widthPct = Math.min(100, Math.round((magnitude / maxMagnitude) * 100));

  return (
    <div className={metricDelightClass(tone, "bar")}>
      <span className="metric-delight-bar-label">{label}</span>
      <span className="metric-delight-bar-track" aria-hidden>
        <span
          className={metricDelightClass(tone, "bar-fill")}
          style={{ width: `${widthPct}%` }}
        />
      </span>
    </div>
  );
}

export function StandoutFlag({
  children = "Standout",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${metricDelightClass("neutral", "flag")} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function StandoutDelta({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "positive" | "negative" | "neutral";
}) {
  if (tone === "neutral") return <>{children}</>;
  return (
    <span className={metricDelightClass(tone, "delta")}>{children}</span>
  );
}

export function delightValueSize(
  tone: MetricDelightTone,
  index: number,
): "hero" | "lg" | "md" {
  if (isStandoutTone(tone) || (isDirectionalTone(tone) && index === 0)) {
    return isStandoutTone(tone) ? "hero" : "lg";
  }
  return isDirectionalTone(tone) ? "lg" : "md";
}
