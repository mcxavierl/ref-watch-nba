"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { InsightPillItem } from "@/components/ui/types";

const CYCLE_MS = 200;

function typeTone(type: InsightPillItem["type"]): {
  border: string;
  metric: string;
  badge: string;
} {
  if (type === "positive") {
    return {
      border:
        "border-[color-mix(in_srgb,var(--accent-positive)_35%,var(--border-subtle))]",
      metric: "text-[var(--accent-positive)]",
      badge:
        "bg-[var(--metric-positive-surface)] text-[var(--accent-positive)]",
    };
  }

  return {
    border:
      "border-[color-mix(in_srgb,var(--accent-negative)_35%,var(--border-subtle))]",
    metric: "text-[var(--accent-negative)]",
    badge: "bg-[var(--metric-negative-surface)] text-[var(--accent-negative)]",
  };
}

export type DynamicInsightPillProps = {
  insights: InsightPillItem[];
  className?: string;
};

export function DynamicInsightPill({
  insights,
  className = "",
}: DynamicInsightPillProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRegionId = useId();

  const safeInsights = insights.filter(
    (item) =>
      item.badgeText.trim() !== "" ||
      item.metric.trim() !== "" ||
      item.description.trim() !== "",
  );

  const hasMultiple = safeInsights.length > 1;
  const current = safeInsights[index];

  const cycle = useCallback(() => {
    if (!hasMultiple) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setVisible(false);
    timeoutRef.current = setTimeout(() => {
      setIndex((active) => (active + 1) % safeInsights.length);
      setVisible(true);
      timeoutRef.current = null;
    }, CYCLE_MS / 2);
  }, [hasMultiple, safeInsights.length]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (index >= safeInsights.length) {
      setIndex(0);
    }
  }, [index, safeInsights.length]);

  if (!current) {
    return null;
  }

  const tone = typeTone(current.type);
  const positionLabel = hasMultiple
    ? ` (${index + 1} of ${safeInsights.length})`
    : "";
  const actionHint = hasMultiple ? ". Activate to view the next insight." : "";

  const pillBody = (
    <>
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.06em] ${tone.badge}`}
      >
        {current.badgeText}
      </span>
      <span
        className={`shrink-0 font-mono text-[0.78rem] font-semibold tabular-nums ${tone.metric}`}
      >
        {current.metric}
      </span>
      <span className="min-w-0 truncate text-[0.78rem] text-[var(--text-secondary)]">
        {current.description}
      </span>
      {hasMultiple ? (
        <span
          aria-hidden="true"
          className="shrink-0 text-[0.72rem] font-medium text-[var(--text-muted)]"
        >
          {" "}
          • More
        </span>
      ) : null}
    </>
  );

  if (!hasMultiple) {
    return (
      <div
        className={`dynamic-insight-pill dynamic-insight-pill--${current.type} inline-flex max-w-full items-center gap-1.5 rounded-full border bg-[var(--bg-surface-2)] px-4 py-1.5 ${tone.border} ${className}`}
        title={`${current.badgeText}: ${current.metric} - ${current.description}`}
      >
        {pillBody}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`dynamic-insight-pill dynamic-insight-pill--${current.type} rw-focus-visible inline-flex max-w-full items-center gap-1.5 rounded-full border bg-[var(--bg-surface-2)] px-4 py-1.5 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-[var(--accent-brand)] hover:bg-[color-mix(in_srgb,var(--accent-brand)_10%,var(--bg-surface-2))] ${tone.border} ${className}`}
        onClick={cycle}
        aria-label={`${current.badgeText}: ${current.metric}. ${current.description}${positionLabel}${actionHint}`}
        aria-controls={liveRegionId}
      >
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
            visible
              ? "translate-y-0 opacity-100"
              : "translate-y-0.5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
          }`}
        >
          {pillBody}
        </span>
      </button>

      <p id={liveRegionId} className="sr-only" aria-live="polite" aria-atomic="true">
        {current.badgeText}: {current.metric}. {current.description}
        {positionLabel}
      </p>
    </>
  );
}
