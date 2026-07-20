import type { OfficialStats } from "@/lib/types";
import "./archetype-card.css";

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
        <p className="archetype-terminal-eyebrow">Ref-Intelligence terminal</p>
        <div className="archetype-terminal-title-row">
          <h3 id="ref-archetype-card-title" className="archetype-terminal-title">
            [{displayName}]
          </h3>
          <span className="archetype-terminal-badge">
            Consistency: {consistencyScore}/10
          </span>
        </div>
      </div>

      <p className="archetype-terminal-blurb">{blurb}</p>

      <dl className="archetype-terminal-grid">
        <div className="archetype-terminal-stat">
          <dt>Admin ratio</dt>
          <dd>{officialStats.admin_ratio.toFixed(2)}</dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Close-game pressure</dt>
          <dd>{officialStats.pressure_sensitive ? "Sensitive" : "Stable"}</dd>
        </div>
        <div className="archetype-terminal-stat">
          <dt>Sample window</dt>
          <dd>{officialStats.sample_games} games</dd>
        </div>
      </dl>
    </section>
  );
}
