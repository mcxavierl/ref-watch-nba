"use client";

import type { ReactNode } from "react";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { TermHelp } from "@/components/TermHelp";
import type { GlossaryId } from "@/lib/glossary";

type MetricTermLabelProps = {
  label: ReactNode;
  hint: string;
  className?: string;
};

/** Metric title with dotted underline and hover tooltip. */
export function MetricTermLabel({
  label,
  hint,
  className = "",
}: MetricTermLabelProps) {
  return (
    <MetricInfoHint hint={hint} className={className}>
      <span className="metric-term-label border-b border-dotted border-slate-500 cursor-help">
        {label}
      </span>
    </MetricInfoHint>
  );
}

/** Glossary-backed metric label (TermHelp + dotted underline). */
export function GlossaryMetricLabel({
  id,
  children,
  className = "",
}: {
  id: GlossaryId;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <TermHelp id={id} className={`metric-term-label-wrap ${className}`.trim()}>
      {children}
    </TermHelp>
  );
}
