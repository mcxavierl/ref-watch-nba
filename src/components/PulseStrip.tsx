import { buildPulseStripStats } from "@/lib/pulse-strip-stats";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type PulseStripProps = {
  data: CrossLeagueOverview;
};

type PulseStripDotTone = "live" | "neutral" | "verified";

function PulseStripToken({
  label,
  value,
  dotTone,
}: {
  label: string;
  value: string;
  dotTone: PulseStripDotTone;
}) {
  return (
    <span className="overview-pulse-strip-token">
      <span
        className={`overview-pulse-strip-dot overview-pulse-strip-dot--${dotTone}`}
        aria-hidden
      />
      <span className="overview-pulse-strip-label">{label}:</span>{" "}
      <span className="overview-pulse-strip-value">{value}</span>
    </span>
  );
}

export function PulseStrip({ data }: PulseStripProps) {
  const stats = buildPulseStripStats(data);
  const gamesLabel =
    stats.gamesToday > 0
      ? `${stats.gamesToday.toLocaleString("en-US")} Games Today`
      : "0 Games Today";

  return (
    <div className="overview-pulse-strip-shell" aria-label="Live telemetry">
      <div className="overview-pulse-strip">
        <p className="overview-pulse-strip-copy">
          <PulseStripToken label="Live" value={gamesLabel} dotTone="live" />
          <span className="overview-pulse-strip-divider" aria-hidden>
            |
          </span>
          <PulseStripToken
            label="Foul rate"
            value={stats.foulRate}
            dotTone="neutral"
          />
          <span className="overview-pulse-strip-divider" aria-hidden>
            |
          </span>
          <PulseStripToken
            label="Status"
            value={stats.status}
            dotTone="verified"
          />
        </p>
      </div>
    </div>
  );
}
