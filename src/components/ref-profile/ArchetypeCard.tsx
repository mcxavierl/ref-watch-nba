import type { OfficialStats } from "@/lib/types";
import "./scouting-report.css";

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
      className="archetype-card"
      aria-labelledby="ref-archetype-card-title"
    >
      <div className="archetype-card-head">
        <div>
          <p className="archetype-card-kicker">Ref-Intelligence</p>
          <h3 id="ref-archetype-card-title" className="archetype-card-title">
            {displayName}
          </h3>
        </div>
        <div className="archetype-consistency">
          <span className="archetype-consistency-label">Consistency</span>
          <span className="archetype-consistency-value">{consistencyScore}/10</span>
        </div>
      </div>

      <p className="archetype-card-blurb">{blurb}</p>

      <div className="archetype-card-metrics">
        <div className="archetype-card-metric">
          <span className="archetype-card-metric-label">Admin ratio</span>
          <span className="archetype-card-metric-value">
            {officialStats.adminRatio.toFixed(2)}
          </span>
        </div>
        <div className="archetype-card-metric">
          <span className="archetype-card-metric-label">Close-game pressure</span>
          <span className="archetype-card-metric-value">
            {officialStats.pressureSensitive ? "Sensitive" : "Stable"}
          </span>
        </div>
        <div className="archetype-card-metric">
          <span className="archetype-card-metric-label">Sample</span>
          <span className="archetype-card-metric-value">
            {officialStats.sampleGames} games
          </span>
        </div>
      </div>
    </section>
  );
}
