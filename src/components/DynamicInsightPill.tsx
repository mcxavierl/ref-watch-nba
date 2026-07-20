"use client";

import { useCallback, useId, useState } from "react";
import type { RefMasterInsight } from "@/lib/ref-master-insights";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";
import { Pill } from "@/components/ui/Pill";

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
      <Pill
        variant="insight"
        confidence={insight.confidence}
        static
        title={insight.shortLine}
      >
        {insight.pillLabel}
      </Pill>
    );
  }

  return (
    <Pill
      as="button"
      variant="insight"
      confidence={insight.confidence}
      active={expanded}
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={onToggle}
    >
      {insight.pillLabel}
    </Pill>
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
