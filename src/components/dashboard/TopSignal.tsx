import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TopSignalView } from "@/lib/homepage-intelligence";
import "@/components/dashboard/intelligence-dashboard.css";

type TopSignalProps = {
  signal: TopSignalView;
};

export function TopSignal({ signal }: TopSignalProps) {
  return (
    <section
      className="top-signal section-block"
      aria-labelledby="top-signal-heading"
    >
      <div className="top-signal-header">
        <h2 className="overview-section-title" id="top-signal-heading">
          Top Signal Today
        </h2>
        <span className="top-signal-live-badge">
          <span className="top-signal-live-dot" aria-hidden />
          Live intelligence
        </span>
      </div>

      <article className="top-signal-card">
        <div className="top-signal-card-main">
          <div className="top-signal-percentile-badge" aria-label={signal.percentileLabel}>
            <span className="top-signal-percentile-value">{signal.percentile}</span>
            <span className="top-signal-percentile-label">{signal.percentileLabel}</span>
          </div>

          <div className="top-signal-copy">
            <p className="top-signal-kicker">{signal.leagueLabel} · Featured signal</p>
            <h3 className="top-signal-matchup">{signal.matchupTitle}</h3>
            <p className="top-signal-stats">{signal.statBreakdown}</p>
            <p className="top-signal-headline">{signal.headline}</p>
          </div>
        </div>

        <Link href={signal.href} className="top-signal-cta rw-focus-ring">
          Open Intelligence
          <ArrowRight className="top-signal-cta-icon" aria-hidden />
        </Link>
      </article>
    </section>
  );
}
