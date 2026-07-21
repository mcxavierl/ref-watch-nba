import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InsightCard } from "@/components/shared/InsightCard";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { selectTopSignalInsight } from "@/lib/homepage-intelligence";
import {
  insightToneToSemanticRole,
  semanticBadgeSurfaceClass,
} from "@/lib/semantic-badge-colors";

type OverviewFeaturedSignalProps = {
  data: CrossLeagueOverview;
};

export function OverviewFeaturedSignal({ data }: OverviewFeaturedSignalProps) {
  const signal = selectTopSignalInsight(data);
  if (!signal) return null;

  const role = insightToneToSemanticRole(signal.heroTone);

  return (
    <section
      className="overview-featured-signal section-block"
      aria-labelledby="overview-featured-signal-heading"
    >
      <div className="overview-section-header overview-section-header--primary">
        <div className="overview-featured-signal-header">
          <h2 className="overview-section-title" id="overview-featured-signal-heading">
            Top Signal Today
          </h2>
          <span
            className={`overview-featured-signal-badge ${semanticBadgeSurfaceClass(role)}`}
          >
            {signal.shortLabel} · Featured
          </span>
        </div>
        <p className="overview-section-lead">
          Highest-confidence crew or ref×team effect on today&apos;s slate.
        </p>
      </div>

      <div className="overview-featured-signal-card">
        <InsightCard card={signal} variant="featured" index={0} />
      </div>

      {signal.entityHref ? (
        <p className="overview-featured-signal-cta">
          <Link href={signal.entityHref} className="overview-featured-signal-link rw-focus-ring">
            Open full profile
            <ArrowRight className="overview-featured-signal-link-icon" aria-hidden />
          </Link>
        </p>
      ) : null}
    </section>
  );
}
