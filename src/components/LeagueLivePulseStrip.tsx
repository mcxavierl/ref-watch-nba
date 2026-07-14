import type { LeagueLivePulseStat, LiveLeagueId } from "@/lib/league-live-pulse";

export function LeagueLivePulseStrip({
  leagueId,
  stats,
}: {
  leagueId: LiveLeagueId;
  stats: LeagueLivePulseStat[];
}) {
  return (
    <section
      className="league-live-pulse"
      data-league={leagueId}
      aria-label="Live officiating pulse"
    >
      <div className="league-live-pulse-kicker">
        <span className="league-live-pulse-dot" aria-hidden />
        Live Pulse
      </div>
      <div className="league-live-pulse-grid">
        {stats.map((stat) => (
          <div key={stat.id} className="league-live-pulse-stat">
            <span className="league-live-pulse-label">{stat.label}</span>
            <span className="league-live-pulse-value data-signal">
              {stat.value}
            </span>
            {stat.caption && (
              <span className="league-live-pulse-caption">{stat.caption}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
