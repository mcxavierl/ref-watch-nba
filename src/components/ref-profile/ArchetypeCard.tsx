"use client";

import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { consistencyStateClass, STATE_COLOR_CLASS } from "@/constants/colors";
import type { OfficialStats } from "@/lib/types";
import "./archetype-card.css";

const ARCHETYPE_TOOLTIP =
  "This archetype is derived from the official's Admin-to-Subjective ratio, representing their impact on total-game volatility.";

type ArchetypeCardProps = {
  displayName: string;
  blurb: string;
  consistencyScore: number;
  officialStats: OfficialStats;
};

export function ArchetypeCard({
  displayName,
  blurb,
  consistencyScore,
  officialStats,
}: ArchetypeCardProps) {
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
            <span
              className={`archetype-terminal-badge tabular-nums ${consistencyStateClass(consistencyScore)}`}
            >
              Consistency: {consistencyScore}/10
            </span>
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
