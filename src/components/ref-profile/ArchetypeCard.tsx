"use client";

import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import {
  consistencyClassificationDisplayLabel,
  type ConsistencyClassificationLabel,
} from "@/lib/analytics/consistency-variance";
import {
  consistencyIndexStateClass,
  consistencyStateClass,
  STATE_COLOR_CLASS,
} from "@/constants/colors";
import type { OfficialStats } from "@/lib/types";
import "./archetype-card.css";

const ARCHETYPE_TOOLTIP =
  "This archetype is derived from the official's Admin-to-Subjective ratio, representing their impact on total-game volatility.";

const CONSISTENCY_TOOLTIP =
  "Consistency Index compares whistle-volume standard deviation against the league baseline. Higher scores mean more predictable foul totals.";

type ArchetypeCardProps = {
  displayName: string;
  blurb: string;
  consistencyScore: number;
  officialStats: OfficialStats;
};

function consistencyBadgeLabel(officialStats: OfficialStats): string {
  const label = officialStats.consistency_classification_label;
  if (!label) return "Insufficient whistle sample";
  return consistencyClassificationDisplayLabel(label as ConsistencyClassificationLabel);
}

export function ArchetypeCard({
  displayName,
  blurb,
  consistencyScore,
  officialStats,
}: ArchetypeCardProps) {
  const consistencyIndex = officialStats.consistency_index;
  const consistencyClass =
    consistencyIndex !== null && consistencyIndex !== undefined
      ? consistencyIndexStateClass(consistencyIndex)
      : consistencyStateClass(consistencyScore);

  return (
    <section
      className="archetype-terminal-card"
      aria-labelledby="ref-archetype-card-title"
    >
      <div className="archetype-terminal-head">
        <div>
          <p className="archetype-terminal-eyebrow">Ref-Intelligence terminal</p>
          <div className="archetype-terminal-title-row">
            <MetricInfoHint hint={ARCHETYPE_TOOLTIP}>
              <h3 id="ref-archetype-card-title" className="archetype-terminal-title">
                [{displayName}]
              </h3>
            </MetricInfoHint>
            <MetricInfoHint hint={CONSISTENCY_TOOLTIP}>
              <span
                className={`archetype-terminal-badge tabular-nums ${consistencyClass}`}
              >
                {consistencyIndex !== null && consistencyIndex !== undefined
                  ? `Consistency: ${consistencyIndex}/100`
                  : `Consistency: ${consistencyScore}/10`}
              </span>
            </MetricInfoHint>
          </div>
        </div>
      </div>

      <p className="archetype-terminal-blurb">{blurb}</p>

      <dl className="archetype-terminal-grid">
        <div className="archetype-terminal-stat">
          <dt>Admin ratio</dt>
          <dd className="tabular-nums">{officialStats.admin_ratio.toFixed(2)}</dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Whistle variance</dt>
          <dd className={`tabular-nums ${consistencyClass}`}>
            {consistencyBadgeLabel(officialStats)}
          </dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Close-game pressure</dt>
          <dd
            className={
              officialStats.pressure_sensitive
                ? STATE_COLOR_CLASS.caution
                : STATE_COLOR_CLASS.stable
            }
          >
            {officialStats.pressure_sensitive ? "Sensitive" : "Stable"}
          </dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Sample window</dt>
          <dd className="tabular-nums">{officialStats.sample_games} games</dd>
        </div>
      </dl>
    </section>
  );
}
