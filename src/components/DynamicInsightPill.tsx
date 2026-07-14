"use client";

import { useCallback, useId, useState } from "react";
import type { RefMasterInsight } from "@/lib/ref-master-insights";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";

function confidenceClass(confidence: RefMasterInsight["confidence"]): string {
  return confidence === "high"
    ? "ref-master-insight-pill--high"
    : "ref-master-insight-pill--moderate";
}

export function DynamicInsightPill({
  insight,
  expanded,
  onToggle,
}: {
  insight: RefMasterInsight;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  if (!insight.interactive) {
    return (
      <span
        className={`ref-master-insight-pill ref-master-insight-pill--static ${confidenceClass(insight.confidence)}`}
        title={insight.shortLine}
      >
        {insight.pillLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`ref-master-insight-pill rw-focus-visible ${confidenceClass(insight.confidence)}${
        expanded ? " ref-master-insight-pill--active" : ""
      }`}
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={onToggle}
    >
      {insight.pillLabel}
    </button>
  );
}

export function DynamicInsightPillRow({
  insights,
}: {
  insights: RefMasterInsight[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelId = useId();

  const toggle = useCallback((id: string, interactive: boolean) => {
    if (!interactive) return;
    setActiveId((current) => (current === id ? null : id));
  }, []);

  if (insights.length === 0) return null;

  const active = insights.find((row) => row.id === activeId) ?? null;
  const multiInteractive = insights.filter((row) => row.interactive).length > 1;

  return (
    <div className="ref-master-insight-stack">
      <div
        className="ref-master-insight-pills"
        role={multiInteractive ? "group" : undefined}
        aria-label={multiInteractive ? "Official insight signals" : undefined}
      >
        {insights.map((insight) => (
          <DynamicInsightPill
            key={insight.id}
            insight={insight}
            expanded={activeId === insight.id}
            onToggle={() => toggle(insight.id, insight.interactive)}
          />
        ))}
      </div>

      {active?.interactive && activeId === active.id ? (
        <div
          id={panelId}
          className="ref-master-insight-panel"
          role="region"
          aria-label={`${active.pillLabel} detail`}
        >
          <p className="ref-master-insight-panel-headline">{active.headline}</p>
          <p className="ref-master-insight-panel-summary">{active.summary}</p>
          <p className="ref-master-insight-panel-line">{active.shortLine}</p>

          <RefDashboardStatGrid>
            {active.stats.map((stat) => (
              <RefDashboardStatCell
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
              />
            ))}
          </RefDashboardStatGrid>

          {active.footnote ? (
            <p className="ref-master-insight-panel-footnote">{active.footnote}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
