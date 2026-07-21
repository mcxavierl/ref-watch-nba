"use client";

import { GlossaryMetricLabel } from "@/components/shared/MetricTermLabel";
import {
  RefProfileBadgePill,
  RefProfileBadgeRow,
} from "@/components/ref-profile/RefProfileBadgeRow";
import { consistencyStateClass } from "@/constants/colors";
import type { OfficialStats } from "@/lib/types";
import "./archetype-card.css";

type ArchetypeCardProps = {
  displayName: string;
  blurb: string;
  consistencyScore: number;
  officialStats: OfficialStats;
  leagueLabel?: string;
};

export function ArchetypeCard({
  displayName,
  blurb,
  consistencyScore,
  officialStats,
  leagueLabel,
}: ArchetypeCardProps) {
  const consistencyClass = consistencyStateClass(consistencyScore);

  return (
    <section
      className="archetype-terminal-card"
      aria-labelledby="ref-archetype-card-title"
    >
      <div className="archetype-terminal-head">
        <p className="archetype-terminal-eyebrow">Ref-Intelligence terminal</p>
        <RefProfileBadgeRow aria-label="Official profile tags">
          <GlossaryMetricLabel id="archetype">
            <RefProfileBadgePill tone="neutral">
              <span id="ref-archetype-card-title">[{displayName}]</span>
            </RefProfileBadgePill>
          </GlossaryMetricLabel>
          <GlossaryMetricLabel id="consistency-score">
            <RefProfileBadgePill
              tone={
                consistencyClass.includes("volatile")
                  ? "negative"
                  : consistencyClass.includes("stable")
                    ? "positive"
                    : "neutral"
              }
              className="tabular-nums"
            >
              Consistency: {consistencyScore}/10
            </RefProfileBadgePill>
          </GlossaryMetricLabel>
          {leagueLabel ? (
            <RefProfileBadgePill tone="neutral">{leagueLabel}</RefProfileBadgePill>
          ) : null}
          {officialStats.pressure_sensitive ? (
            <RefProfileBadgePill tone="caution">Pressure-sensitive</RefProfileBadgePill>
          ) : null}
        </RefProfileBadgeRow>
      </div>

      <p className="archetype-terminal-blurb">{blurb}</p>

      <dl className="archetype-terminal-grid">
        <div className="archetype-terminal-stat">
          <dt>Admin ratio</dt>
          <dd className="tabular-nums">{officialStats.admin_ratio.toFixed(2)}</dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Close-game pressure</dt>
          <dd className="tabular-nums">
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
